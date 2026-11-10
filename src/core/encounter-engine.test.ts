import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isWithinProximity,
  generateRotatingIdentifier,
  formatDuration,
  stepEncounterStateMachine,
  DEFAULT_GRACE_PERIOD_MS,
  RSSI_PROXIMITY_THRESHOLD,
} from './encounter-engine';
import {
  checkCapsuleUnlockStatus,
  getUnlockDelaySeconds,
  encryptCapsulePayload,
  decryptCapsulePayload,
} from './vault-crypto';
import {
  calculateSocialOverview,
  calculateRelationshipStats,
  generateActivityHeatmap,
} from './analytics-calc';
import { EncounterSession, TimeCapsuleMessage, UserProfile } from '../types';

test('isWithinProximity correctly evaluates RSSI values', () => {
  assert.equal(isWithinProximity(-60), true);
  assert.equal(isWithinProximity(-78), true); // boundary
  assert.equal(isWithinProximity(-85), false); // too far
});

test('formatDuration formats seconds accurately', () => {
  assert.equal(formatDuration(45), '45s');
  assert.equal(formatDuration(120), '2m');
  assert.equal(formatDuration(3600), '1h');
  assert.equal(formatDuration(4800), '1h 20m');
});

test('generateRotatingIdentifier rotates deterministically across 15min intervals', () => {
  const t0 = 1700000000000;
  const id1 = generateRotatingIdentifier('user_joy', t0);
  const id2 = generateRotatingIdentifier('user_joy', t0 + 1000); // within same window
  const id3 = generateRotatingIdentifier('user_joy', t0 + 16 * 60 * 1000); // new window

  assert.equal(id1, id2, 'IDs within same 15min interval should match');
  assert.notEqual(id1, id3, 'ID should rotate in the next time window');
  assert.ok(id1.startsWith('rpi-'));
});

test('stepEncounterStateMachine handles discovery, connection, grace period, and ending', () => {
  const initialSession: EncounterSession = {
    id: 'enc-1',
    userAId: 'joy',
    userBId: 'bruno',
    partnerName: 'Bruno',
    partnerAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde',
    startedAt: new Date(100000).toISOString(),
    durationSeconds: 0,
    lastRssi: -90,
    state: 'DISCONNECTED',
    stateUpdatedAt: 100000,
    isMutualVerified: false,
  };

  // 1. Discover when RSSI is strong
  const discovered = stepEncounterStateMachine(
    initialSession,
    'BLE_ADVERTISEMENT_DETECTED',
    -65,
    101000
  );
  assert.equal(discovered.state, 'DISCOVERED');

  // 2. Verification succeeds
  const connected = stepEncounterStateMachine(
    discovered,
    'VERIFICATION_SUCCESS',
    -65,
    102000
  );
  assert.equal(connected.state, 'CONNECTED');
  assert.equal(connected.isMutualVerified, true);

  // 3. Signal drops -> TEMPORARILY_LOST with grace period
  const lost = stepEncounterStateMachine(
    connected,
    'SIGNAL_LOST',
    -95,
    105000,
    DEFAULT_GRACE_PERIOD_MS
  );
  assert.equal(lost.state, 'TEMPORARILY_LOST');
  assert.equal(lost.gracePeriodExpiresAt, 105000 + DEFAULT_GRACE_PERIOD_MS);

  // 4. Signal recovered within grace period -> CONNECTED
  const recovered = stepEncounterStateMachine(
    lost,
    'BLE_ADVERTISEMENT_DETECTED',
    -68,
    110000
  );
  assert.equal(recovered.state, 'CONNECTED');
  assert.equal(recovered.gracePeriodExpiresAt, undefined);

  // 5. Signal lost again and grace period expires -> ENDED
  const lostAgain = stepEncounterStateMachine(
    recovered,
    'SIGNAL_LOST',
    -99,
    120000,
    DEFAULT_GRACE_PERIOD_MS
  );
  const ended = stepEncounterStateMachine(
    lostAgain,
    'HEARTBEAT',
    -99,
    120000 + DEFAULT_GRACE_PERIOD_MS + 1000
  );
  assert.equal(ended.state, 'ENDED');
  assert.ok(ended.endedAt);
});

test('vault crypto and unlock conditions', async () => {
  assert.equal(getUnlockDelaySeconds('ON_DISCONNECT'), 0);
  assert.equal(getUnlockDelaySeconds('DELAY_30_MINUTES'), 1800);

  const payload = 'I had an amazing coffee chat with you today!';
  const secretKey = 'together_shared_secret';
  const encrypted = await encryptCapsulePayload(payload, secretKey);
  assert.notEqual(encrypted, payload);

  const decrypted = await decryptCapsulePayload(encrypted, secretKey);
  assert.equal(decrypted, payload);

  const capsule: TimeCapsuleMessage = {
    id: 'msg-1',
    senderId: 'joy',
    senderName: 'Joy',
    senderAvatar: '',
    recipientId: 'bruno',
    recipientName: 'Bruno',
    recipientAvatar: '',
    encryptedPayload: encrypted,
    unlockType: 'DELAY_30_MINUTES',
    unlockDelaySeconds: 1800,
    isDeliveredDirectBle: true,
    isUnlocked: false,
    createdAt: new Date(100000).toISOString(),
    disconnectTimestamp: 100000,
  };

  // While still together, should remain locked
  const lockCheck1 = checkCapsuleUnlockStatus(capsule, 100500, true);
  assert.equal(lockCheck1.isReady, false);

  // After disconnect, but only 10 minutes elapsed (needs 30 mins)
  const lockCheck2 = checkCapsuleUnlockStatus(capsule, 100000 + 600 * 1000, false);
  assert.equal(lockCheck2.isReady, false);
  assert.equal(lockCheck2.remainingSeconds, 1200);

  // After 35 minutes elapsed -> Ready!
  const lockCheck3 = checkCapsuleUnlockStatus(capsule, 100000 + 2100 * 1000, false);
  assert.equal(lockCheck3.isReady, true);
});

test('analytics calculation verifies Joy, Bruno, and Eriksen numbers', () => {
  const mockUsers: Record<string, UserProfile> = {
    joy: {
      id: 'joy',
      username: 'joy',
      displayName: 'Joy',
      avatarUrl: '',
      publicKey: 'pk1',
      bluetoothEnabled: true,
      invisibleMode: false,
      createdAt: '2026-01-01',
    },
    bruno: {
      id: 'bruno',
      username: 'bruno',
      displayName: 'Bruno',
      avatarUrl: '',
      publicKey: 'pk2',
      bluetoothEnabled: true,
      invisibleMode: false,
      createdAt: '2026-01-01',
    },
    eriksen: {
      id: 'eriksen',
      username: 'eriksen',
      displayName: 'Eriksen',
      avatarUrl: '',
      publicKey: 'pk3',
      bluetoothEnabled: true,
      invisibleMode: false,
      createdAt: '2026-01-01',
    },
  };

  const today = new Date('2026-11-10T12:00:00Z');
  const encounters: EncounterSession[] = [
    {
      id: 'e1',
      userAId: 'joy',
      userBId: 'bruno',
      partnerName: 'Bruno',
      partnerAvatar: '',
      startedAt: '2026-11-10T09:00:00Z',
      endedAt: '2026-11-10T10:20:00Z',
      durationSeconds: 4800, // 1h 20m
      lastRssi: -65,
      state: 'ENDED',
      stateUpdatedAt: 0,
      isMutualVerified: true,
    },
    {
      id: 'e2',
      userAId: 'joy',
      userBId: 'eriksen',
      partnerName: 'Eriksen',
      partnerAvatar: '',
      startedAt: '2026-11-10T14:00:00Z',
      endedAt: '2026-11-10T16:05:00Z',
      durationSeconds: 7500, // 2h 05m
      lastRssi: -62,
      state: 'ENDED',
      stateUpdatedAt: 0,
      isMutualVerified: true,
    },
  ];

  const overview = calculateSocialOverview(encounters, mockUsers, 'joy', today);
  assert.equal(overview.peopleEncounteredTodayCount, 2);
  assert.equal(overview.totalSocialTimeTodaySeconds, 4800 + 7500); // 12300s = 3h 25m
  assert.equal(overview.mostSpentWithUser?.user.username, 'eriksen');

  const brunoStats = calculateRelationshipStats(encounters, 'joy', 'bruno', today);
  assert.equal(brunoStats.todaySeconds, 4800);
  assert.equal(brunoStats.totalMeetings, 1);
  assert.equal(brunoStats.longestMeetingSeconds, 4800);

  const heatmap = generateActivityHeatmap(encounters, 'joy');
  assert.equal(heatmap.length, 7);
  assert.equal(heatmap[0].length, 24);
});
