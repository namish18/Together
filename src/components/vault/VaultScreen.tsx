import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Lock,
  Unlock,
  Sparkles,
  Plus,
  Send,
  Clock,
  Radio,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Eye,
  Gift,
  KeyRound,
  X,
} from 'lucide-react';
import { useTogether } from '../../context/TogetherContext';
import { checkCapsuleUnlockStatus } from '../../core/vault-crypto';
import { TimeCapsuleMessage, UnlockConditionType } from '../../types';
import { MOCK_USERS } from '../../data/mock-data';

interface Props {
  initialRecipientId?: string | null;
  onClearInitialRecipient?: () => void;
}

export const VaultScreen: React.FC<Props> = ({ initialRecipientId, onClearInitialRecipient }) => {
  const {
    currentUser,
    capsules,
    createCapsule,
    unlockCapsule,
    activeEncounter,
    friends,
  } = useTogether();

  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [showCompose, setShowCompose] = useState(!!initialRecipientId);
  const [recipientId, setRecipientId] = useState(initialRecipientId || 'user_bruno');
  const [messageText, setMessageText] = useState('');
  const [unlockType, setUnlockType] = useState<UnlockConditionType>('DELAY_30_MINUTES');
  const [specificDateTime, setSpecificDateTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUnlockedCapsule, setSelectedUnlockedCapsule] = useState<TimeCapsuleMessage | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());

  // Update timer every second for live countdowns
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Update compose modal if initial recipient changes
  useEffect(() => {
    if (initialRecipientId) {
      setRecipientId(initialRecipientId);
      setShowCompose(true);
      onClearInitialRecipient?.();
    }
  }, [initialRecipientId, onClearInitialRecipient]);

  const receivedCapsules = capsules.filter((c) => c.recipientId === currentUser.id);
  const sentCapsules = capsules.filter((c) => c.senderId === currentUser.id);

  const handleComposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    try {
      setIsSubmitting(true);
      await createCapsule(recipientId, messageText.trim(), unlockType, specificDateTime);
      setMessageText('');
      setShowCompose(false);
      setActiveTab('sent');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCapsule = async (cap: TimeCapsuleMessage) => {
    const decrypted = await unlockCapsule(cap.id);
    if (decrypted) {
      // Trigger festive celebratory confetti!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#ec4899', '#8b5cf6', '#10b981'],
      });

      setSelectedUnlockedCapsule({
        ...cap,
        isUnlocked: true,
        plaintextPreview: decrypted,
      });
    }
  };

  const unlockConditionLabels: Record<UnlockConditionType, string> = {
    ON_DISCONNECT: 'Immediately after Bluetooth disconnection',
    DELAY_5_MINUTES: '5 minutes after Bluetooth disconnection',
    DELAY_30_MINUTES: '30 minutes after Bluetooth disconnection',
    DELAY_1_HOUR: '1 hour after Bluetooth disconnection',
    DELAY_24_HOURS: '24 hours after Bluetooth disconnection',
    SPECIFIC_DATETIME: 'At a scheduled date & time',
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto space-y-4 text-stone-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Secret Vault</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </h1>
          <p className="text-xs text-stone-400">End-to-End Encrypted Time Capsules</p>
        </div>

        <button
          onClick={() => setShowCompose(true)}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          <span>New Capsule</span>
        </button>
      </div>

      {/* Vault Concept Banner */}
      <div className="bg-gradient-to-br from-purple-950/40 via-stone-900 to-stone-950 border border-purple-900/40 rounded-3xl p-4 text-xs space-y-2">
        <div className="flex items-center gap-2 text-purple-300 font-semibold">
          <KeyRound className="w-4 h-4 text-purple-400" />
          <span>The Parting Gift</span>
        </div>
        <p className="text-stone-300">
          Leave notes that can only be unlocked <em>after</em> you and your friend part ways. Messages are client-side AES-GCM encrypted and delivered directly via BLE or zero-knowledge backend.
        </p>
      </div>

      {/* Tabs: Received vs Sent */}
      <div className="flex bg-stone-900 p-1 rounded-2xl border border-stone-800">
        <button
          onClick={() => setActiveTab('received')}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'received'
              ? 'bg-stone-800 text-amber-400 shadow-sm'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Received Capsules ({receivedCapsules.length})
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'sent'
              ? 'bg-stone-800 text-amber-400 shadow-sm'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Sent Capsules ({sentCapsules.length})
        </button>
      </div>

      {/* Capsules List */}
      <div className="space-y-3">
        {(activeTab === 'received' ? receivedCapsules : sentCapsules).length === 0 ? (
          <div className="bg-stone-900/40 border border-dashed border-stone-800 rounded-3xl p-8 text-center space-y-2">
            <Gift className="w-8 h-8 text-stone-600 mx-auto" />
            <h4 className="text-sm font-semibold text-stone-300">
              No {activeTab} capsules yet
            </h4>
            <p className="text-xs text-stone-500">
              {activeTab === 'received'
                ? 'When friends leave you time capsules during meetups, they will appear here locked until you part ways.'
                : 'Create a time capsule for Bruno or Eriksen to be unlocked after your next encounter!'}
            </p>
          </div>
        ) : (
          (activeTab === 'received' ? receivedCapsules : sentCapsules).map((cap) => {
            const isPartnerTogether = activeEncounter
              ? activeEncounter.userAId === cap.senderId || activeEncounter.userBId === cap.senderId
              : false;

            const unlockStatus = checkCapsuleUnlockStatus(cap, nowMs, isPartnerTogether);

            return (
              <div
                key={cap.id}
                className={`rounded-2xl border p-4 transition-all ${
                  cap.isUnlocked
                    ? 'bg-stone-900/90 border-stone-800'
                    : unlockStatus.isReady
                    ? 'bg-purple-950/40 border-purple-600/70 shadow-lg shadow-purple-950/20'
                    : 'bg-stone-900/60 border-stone-800/80'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={activeTab === 'received' ? cap.senderAvatar : cap.recipientAvatar}
                      alt={activeTab === 'received' ? cap.senderName : cap.recipientName}
                      className="w-9 h-9 rounded-xl object-cover ring-1 ring-stone-700"
                    />
                    <div>
                      <span className="text-xs font-bold text-stone-100 block">
                        {activeTab === 'received' ? `From ${cap.senderName}` : `To ${cap.recipientName}`}
                      </span>
                      <span className="text-[10px] text-stone-500">
                        Created {new Date(cap.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {cap.isUnlocked ? (
                    <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-950/80 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-medium">
                      <Unlock className="w-3 h-3" />
                      Unlocked
                    </span>
                  ) : unlockStatus.isReady ? (
                    <span className="inline-flex items-center gap-1 text-[11px] bg-purple-500 text-stone-950 px-2 py-0.5 rounded-full font-bold animate-bounce">
                      <Sparkles className="w-3 h-3" />
                      Ready to Open!
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] bg-stone-800 text-stone-400 border border-stone-700 px-2 py-0.5 rounded-full">
                      <Lock className="w-3 h-3" />
                      Locked
                    </span>
                  )}
                </div>

                {/* Unlock condition explanation */}
                <div className="bg-stone-950/50 p-2.5 rounded-xl border border-stone-800/60 text-xs text-stone-400 mb-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-stone-300 font-medium">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Condition: {unlockConditionLabels[cap.unlockType]}</span>
                  </div>
                  {!cap.isUnlocked && (
                    <p className="text-[11px] text-stone-400 font-mono">
                      Status: {unlockStatus.reason}
                    </p>
                  )}
                </div>

                {/* Action or Decrypted Preview */}
                {cap.isUnlocked ? (
                  <div className="bg-stone-950/70 p-3 rounded-xl border border-stone-800 text-xs">
                    <span className="text-[10px] text-stone-400 uppercase tracking-wider block mb-1">
                      Decrypted Time Capsule Message:
                    </span>
                    <p className="text-stone-100 font-serif text-sm leading-relaxed italic">
                      "{cap.plaintextPreview}"
                    </p>
                  </div>
                ) : unlockStatus.isReady && activeTab === 'received' ? (
                  <button
                    onClick={() => handleOpenCapsule(cap)}
                    className="w-full bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-stone-950 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all hover:scale-[1.02]"
                  >
                    <Gift className="w-4 h-4 fill-stone-950" />
                    <span>Open Time Capsule Now</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between text-xs text-stone-400 px-1 font-mono">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      AES-GCM-256 Sealed
                    </span>
                    {unlockStatus.remainingSeconds > 0 && (
                      <span className="text-amber-400 font-bold">
                        {Math.floor(unlockStatus.remainingSeconds / 60)}m {unlockStatus.remainingSeconds % 60}s remaining
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Compose Time Capsule Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-4 text-stone-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Create Secret Time Capsule</span>
              </h3>
              <button
                onClick={() => setShowCompose(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleComposeSubmit} className="space-y-3.5">
              {/* Recipient Selector */}
              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">
                  Recipient:
                </label>
                <select
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-400"
                >
                  {friends.map((f) => (
                    <option key={f.friendId} value={f.friendId}>
                      {f.friend.displayName} (@{f.friend.username})
                    </option>
                  ))}
                </select>
              </div>

              {/* Message Content */}
              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">
                  Secret Message:
                </label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Leave a sweet thought, memory, or recommendation..."
                  rows={3}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              {/* Unlock Condition Selector */}
              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">
                  Unlock Condition:
                </label>
                <select
                  value={unlockType}
                  onChange={(e) => setUnlockType(e.target.value as UnlockConditionType)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-400"
                >
                  <option value="ON_DISCONNECT">Immediately on Bluetooth Disconnect</option>
                  <option value="DELAY_5_MINUTES">5 minutes after Disconnect</option>
                  <option value="DELAY_30_MINUTES">30 minutes after Disconnect (Recommended)</option>
                  <option value="DELAY_1_HOUR">1 hour after Disconnect</option>
                  <option value="DELAY_24_HOURS">24 hours after Disconnect</option>
                  <option value="SPECIFIC_DATETIME">Scheduled Date & Time</option>
                </select>
              </div>

              {unlockType === 'SPECIFIC_DATETIME' && (
                <div>
                  <label className="text-xs font-semibold text-stone-300 block mb-1">
                    Scheduled Time:
                  </label>
                  <input
                    type="datetime-local"
                    value={specificDateTime}
                    onChange={(e) => setSpecificDateTime(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
              )}

              {/* End-to-End Encryption Banner */}
              <div className="p-2.5 rounded-xl bg-stone-950/70 border border-stone-800 text-[11px] text-stone-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Encrypted using recipient's public key before transfer. Plaintext is never stored on the server.
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !messageText.trim()}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4 fill-stone-950" />
                <span>Seal & Arm Time Capsule</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Unlocked Reveal Celebration Modal */}
      {selectedUnlockedCapsule && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-gradient-to-b from-stone-900 to-stone-950 border border-amber-500/50 rounded-3xl p-6 text-center space-y-4 shadow-2xl relative">
            <div className="w-14 h-14 rounded-3xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mx-auto shadow-inner animate-pulse">
              <Gift className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">
                Time Capsule Unlocked!
              </span>
              <h3 className="text-lg font-bold text-white mt-1">
                From {selectedUnlockedCapsule.senderName}
              </h3>
            </div>

            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 text-stone-200 font-serif text-sm leading-relaxed italic shadow-inner">
              "{selectedUnlockedCapsule.plaintextPreview}"
            </div>

            <p className="text-[11px] text-stone-400">
              This capsule was sealed while you were together and unlocked following the parting condition.
            </p>

            <button
              onClick={() => setSelectedUnlockedCapsule(null)}
              className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-2.5 rounded-xl text-xs transition-colors"
            >
              Keep in My Vault
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
