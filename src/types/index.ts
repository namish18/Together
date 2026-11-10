export type EncounterState = 
  | 'DISCONNECTED'
  | 'DISCOVERED'
  | 'VERIFYING'
  | 'CONNECTED'
  | 'TEMPORARILY_LOST'
  | 'ENDED';

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  publicKey: string;
  bluetoothEnabled: boolean;
  invisibleMode: boolean;
  createdAt: string;
}

export interface FriendRelationship {
  id: string;
  userId: string;
  friendId: string;
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
  friend: UserProfile;
  createdDate: string;
}

export interface EncounterSession {
  id: string;
  userAId: string;
  userBId: string;
  partnerName: string;
  partnerAvatar: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  lastRssi: number;
  state: EncounterState;
  stateUpdatedAt: number;
  gracePeriodExpiresAt?: number;
  isMutualVerified: boolean;
}

export type UnlockConditionType = 
  | 'ON_DISCONNECT'
  | 'DELAY_5_MINUTES'
  | 'DELAY_30_MINUTES'
  | 'DELAY_1_HOUR'
  | 'DELAY_24_HOURS'
  | 'SPECIFIC_DATETIME';

export interface TimeCapsuleMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  recipientId: string;
  recipientName: string;
  recipientAvatar: string;
  encryptedPayload: string; // Base64 ciphertext
  plaintextPreview?: string; // Decrypted client-side once unlocked
  unlockType: UnlockConditionType;
  unlockDelaySeconds: number; // 0 for ON_DISCONNECT, 300 for 5m, 1800 for 30m, 3600 for 1h, 86400 for 24h
  specificUnlockTime?: string;
  associatedEncounterId?: string;
  disconnectTimestamp?: number; // Recorded when proximity ends
  isDeliveredDirectBle: boolean;
  isUnlocked: boolean;
  createdAt: string;
}

export interface SocialStatOverview {
  totalSocialTimeTodaySeconds: number;
  peopleEncounteredTodayCount: number;
  mostSpentWithUser?: {
    user: UserProfile;
    durationSeconds: number;
  };
  weeklyTotalSeconds: number;
  monthlyTotalSeconds: number;
  lifetimeTotalSeconds: number;
  totalEncountersCount: number;
}
