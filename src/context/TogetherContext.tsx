import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  EncounterSession,
  FriendRelationship,
  TimeCapsuleMessage,
  UserProfile,
  UnlockConditionType,
} from '../types';
import {
  MOCK_USERS,
  INITIAL_FRIENDS,
  INITIAL_ENCOUNTERS,
  INITIAL_CAPSULES,
} from '../data/mock-data';
import {
  generateRotatingIdentifier,
  stepEncounterStateMachine,
  DEFAULT_GRACE_PERIOD_MS,
  RSSI_PROXIMITY_THRESHOLD,
} from '../core/encounter-engine';
import {
  encryptCapsulePayload,
  decryptCapsulePayload,
  getUnlockDelaySeconds,
  checkCapsuleUnlockStatus,
} from '../core/vault-crypto';

interface TogetherContextType {
  currentUser: UserProfile;
  switchUser: (userId: string) => void;
  friends: FriendRelationship[];
  encounters: EncounterSession[];
  activeEncounter: EncounterSession | null;
  capsules: TimeCapsuleMessage[];
  trackingEnabled: boolean;
  invisibleMode: boolean;
  currentRpi: string;
  isWebBleAvailable: boolean;
  isWebBleScanning: boolean;
  setTrackingEnabled: (enabled: boolean) => void;
  setInvisibleMode: (invisible: boolean) => void;
  // Proximity simulator controls
  simulateBringTogether: (partnerId: string, rssi?: number) => void;
  simulateSeparate: (partnerId: string) => void;
  simulateSignalDrop: (partnerId: string) => void;
  simulateSignalRecover: (partnerId: string) => void;
  // Vault & messaging
  createCapsule: (
    recipientId: string,
    message: string,
    unlockType: UnlockConditionType,
    specificUnlockTime?: string
  ) => Promise<TimeCapsuleMessage>;
  unlockCapsule: (capsuleId: string) => Promise<string | null>;
  // Relationship actions
  addFriendByUsername: (username: string) => boolean;
  removeFriend: (relationshipId: string) => void;
  // Data actions
  exportDataJson: () => void;
  clearEncounterHistory: () => void;
  startWebBluetoothScan: () => Promise<void>;
  // Architecture modal
  showArchModal: boolean;
  setShowArchModal: (show: boolean) => void;
  // Selected person for deep dive
  selectedFriend: FriendRelationship | null;
  setSelectedFriend: (friend: FriendRelationship | null) => void;
  // Active bottom nav tab
  activeTab: 'home' | 'people' | 'time' | 'vault' | 'profile';
  setActiveTab: (tab: 'home' | 'people' | 'time' | 'vault' | 'profile') => void;
}

const TogetherContext = createContext<TogetherContextType | null>(null);

export const TogetherProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(MOCK_USERS.joy);
  const [friends, setFriends] = useState<FriendRelationship[]>(INITIAL_FRIENDS);
  const [encounters, setEncounters] = useState<EncounterSession[]>(INITIAL_ENCOUNTERS);
  const [activeEncounter, setActiveEncounter] = useState<EncounterSession | null>(null);
  const [capsules, setCapsules] = useState<TimeCapsuleMessage[]>(INITIAL_CAPSULES);
  const [trackingEnabled, setTrackingEnabled] = useState<boolean>(true);
  const [invisibleMode, setInvisibleMode] = useState<boolean>(false);
  const [currentRpi, setCurrentRpi] = useState<string>('');
  const [showArchModal, setShowArchModal] = useState<boolean>(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendRelationship | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'people' | 'time' | 'vault' | 'profile'>('home');
  const [isWebBleAvailable, setIsWebBleAvailable] = useState<boolean>(false);
  const [isWebBleScanning, setIsWebBleScanning] = useState<boolean>(false);

  const activeEncounterRef = useRef<EncounterSession | null>(activeEncounter);
  activeEncounterRef.current = activeEncounter;

  // Check Web Bluetooth API availability
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'bluetooth' in (navigator as any)) {
      setIsWebBleAvailable(true);
    }
  }, []);

  // Update rotating ephemeral BLE identifier
  useEffect(() => {
    const updateRpi = () => {
      const rpi = generateRotatingIdentifier(currentUser.id, Date.now());
      setCurrentRpi(rpi);
    };
    updateRpi();
    const interval = setInterval(updateRpi, 60000); // check rotation
    return () => clearInterval(interval);
  }, [currentUser.id]);

  // Live encounter tick timer
  useEffect(() => {
    if (!activeEncounter || activeEncounter.state === 'ENDED') return;

    const interval = setInterval(() => {
      setActiveEncounter((prev) => {
        if (!prev) return null;
        const now = Date.now();
        // If in grace period, check if expired
        if (prev.state === 'TEMPORARILY_LOST' && prev.gracePeriodExpiresAt && now >= prev.gracePeriodExpiresAt) {
          const ended = stepEncounterStateMachine(prev, 'FORCE_END', prev.lastRssi, now);
          // Save to encounters list
          setEncounters((list) => [ended, ...list]);
          // Mark disconnect timestamp on any pending capsules between this pair
          handleEncounterEnded(ended);
          return null;
        }

        if (prev.state === 'CONNECTED') {
          return {
            ...prev,
            durationSeconds: prev.durationSeconds + 1,
            stateUpdatedAt: now,
          };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeEncounter]);

  // When an encounter ends, update disconnect timestamp on related capsules
  const handleEncounterEnded = (ended: EncounterSession) => {
    const partnerId = ended.userAId === currentUser.id ? ended.userBId : ended.userAId;
    const nowMs = Date.now();
    setCapsules((prev) =>
      prev.map((c) => {
        if (
          !c.isUnlocked &&
          !c.disconnectTimestamp &&
          ((c.senderId === currentUser.id && c.recipientId === partnerId) ||
           (c.recipientId === currentUser.id && c.senderId === partnerId))
        ) {
          return {
            ...c,
            disconnectTimestamp: nowMs,
            associatedEncounterId: ended.id,
          };
        }
        return c;
      })
    );
  };

  const switchUser = (userId: string) => {
    const target = Object.values(MOCK_USERS).find((u) => u.id === userId);
    if (target) {
      setCurrentUser(target);
      // Reset active encounter to avoid mixed user states
      if (activeEncounter) {
        setActiveEncounter(null);
      }
    }
  };

  // Simulator: bring another user within Bluetooth proximity
  const simulateBringTogether = (partnerId: string, rssi = -64) => {
    if (!trackingEnabled || invisibleMode) return;
    const partner = Object.values(MOCK_USERS).find((u) => u.id === partnerId);
    if (!partner) return;

    const now = Date.now();
    const newSession: EncounterSession = {
      id: `enc_live_${now}`,
      userAId: currentUser.id,
      userBId: partner.id,
      partnerName: partner.displayName,
      partnerAvatar: partner.avatarUrl,
      startedAt: new Date(now).toISOString(),
      durationSeconds: 0,
      lastRssi: rssi,
      state: 'CONNECTED',
      stateUpdatedAt: now,
      isMutualVerified: true,
    };

    setActiveEncounter(newSession);
  };

  // Simulator: cleanly separate users
  const simulateSeparate = (partnerId: string) => {
    if (!activeEncounter) return;
    const now = Date.now();
    const ended = stepEncounterStateMachine(activeEncounter, 'FORCE_END', -99, now);
    setEncounters((prev) => [ended, ...prev]);
    handleEncounterEnded(ended);
    setActiveEncounter(null);
  };

  // Simulator: signal drops below threshold (triggers grace period)
  const simulateSignalDrop = (partnerId: string) => {
    if (!activeEncounter || activeEncounter.state !== 'CONNECTED') return;
    const now = Date.now();
    const updated = stepEncounterStateMachine(
      activeEncounter,
      'SIGNAL_LOST',
      -95,
      now,
      DEFAULT_GRACE_PERIOD_MS
    );
    setActiveEncounter(updated);
  };

  // Simulator: signal recovers before grace period ends
  const simulateSignalRecover = (partnerId: string) => {
    if (!activeEncounter || activeEncounter.state !== 'TEMPORARILY_LOST') return;
    const now = Date.now();
    const updated = stepEncounterStateMachine(
      activeEncounter,
      'BLE_ADVERTISEMENT_DETECTED',
      -62,
      now
    );
    setActiveEncounter(updated);
  };

  // Create encrypted secret message / time capsule
  const createCapsule = async (
    recipientId: string,
    message: string,
    unlockType: UnlockConditionType,
    specificUnlockTime?: string
  ): Promise<TimeCapsuleMessage> => {
    const recipient = Object.values(MOCK_USERS).find((u) => u.id === recipientId);
    if (!recipient) throw new Error('Recipient not found');

    const encrypted = await encryptCapsulePayload(message, 'together_secret_key');
    const delaySec = getUnlockDelaySeconds(unlockType);

    const newCapsule: TimeCapsuleMessage = {
      id: `capsule_${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      senderAvatar: currentUser.avatarUrl,
      recipientId: recipient.id,
      recipientName: recipient.displayName,
      recipientAvatar: recipient.avatarUrl,
      encryptedPayload: encrypted,
      plaintextPreview: message, // sender can preview their draft
      unlockType,
      unlockDelaySeconds: delaySec,
      specificUnlockTime,
      isDeliveredDirectBle: activeEncounter?.userBId === recipientId,
      isUnlocked: false,
      createdAt: new Date().toISOString(),
      // If currently not together, start disconnect timestamp right away
      disconnectTimestamp: activeEncounter?.userBId === recipientId ? undefined : Date.now(),
    };

    setCapsules((prev) => [newCapsule, ...prev]);
    return newCapsule;
  };

  // Unlock and decrypt a time capsule
  const unlockCapsule = async (capsuleId: string): Promise<string | null> => {
    const cap = capsules.find((c) => c.id === capsuleId);
    if (!cap) return null;

    const decrypted = await decryptCapsulePayload(cap.encryptedPayload, 'together_secret_key');

    setCapsules((prev) =>
      prev.map((c) =>
        c.id === capsuleId ? { ...c, isUnlocked: true, plaintextPreview: decrypted } : c
      )
    );
    return decrypted;
  };

  // Add friend by username
  const addFriendByUsername = (username: string): boolean => {
    const clean = username.trim().toLowerCase().replace('@', '');
    const found = Object.values(MOCK_USERS).find(
      (u) => u.username.toLowerCase() === clean && u.id !== currentUser.id
    );
    if (!found) return false;

    // Check if already friends
    const exists = friends.some((f) => f.friendId === found.id);
    if (exists) return false;

    const newRel: FriendRelationship = {
      id: `rel_${Date.now()}`,
      userId: currentUser.id,
      friendId: found.id,
      status: 'ACCEPTED',
      friend: found,
      createdDate: new Date().toISOString(),
    };

    setFriends((prev) => [...prev, newRel]);
    return true;
  };

  const removeFriend = (relationshipId: string) => {
    setFriends((prev) => prev.filter((f) => f.id !== relationshipId));
  };

  // Export JSON of all encounter history
  const exportDataJson = () => {
    const exportData = {
      user: currentUser,
      exportTimestamp: new Date().toISOString(),
      encounters,
      friends,
      capsules: capsules.map((c) => ({
        ...c,
        encryptedPayload: c.encryptedPayload,
        // Only include plaintext if unlocked
        plaintextPreview: c.isUnlocked ? c.plaintextPreview : '[Encrypted in Vault]',
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `together-data-${currentUser.username}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearEncounterHistory = () => {
    setEncounters([]);
    setActiveEncounter(null);
  };

  // Web Bluetooth API scan (attempts real hardware scan if in browser with support)
  const startWebBluetoothScan = async () => {
    const nav = navigator as any;
    if (typeof navigator === 'undefined' || !nav.bluetooth) {
      alert('Web Bluetooth API is not supported in this browser or iframe environment. Use the Bluetooth Simulator toolbar below to simulate live BLE connections!');
      return;
    }

    try {
      setIsWebBleScanning(true);
      // Request device with optional services
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
      });

      if (device) {
        // Discovered real BLE device
        simulateBringTogether('user_bruno', -60);
      }
    } catch (err: unknown) {
      // User cancelled or browser rejected
      console.log('Bluetooth request was dismissed or unsupported:', err);
    } finally {
      setIsWebBleScanning(false);
    }
  };

  return (
    <TogetherContext.Provider
      value={{
        currentUser,
        switchUser,
        friends,
        encounters,
        activeEncounter,
        capsules,
        trackingEnabled,
        invisibleMode,
        currentRpi,
        isWebBleAvailable,
        isWebBleScanning,
        setTrackingEnabled,
        setInvisibleMode,
        simulateBringTogether,
        simulateSeparate,
        simulateSignalDrop,
        simulateSignalRecover,
        createCapsule,
        unlockCapsule,
        addFriendByUsername,
        removeFriend,
        exportDataJson,
        clearEncounterHistory,
        startWebBluetoothScan,
        showArchModal,
        setShowArchModal,
        selectedFriend,
        setSelectedFriend,
        activeTab,
        setActiveTab,
      }}
    >
      {children}
    </TogetherContext.Provider>
  );
};

export const useTogether = () => {
  const context = useContext(TogetherContext);
  if (!context) {
    throw new Error('useTogether must be used within a TogetherProvider');
  }
  return context;
};
