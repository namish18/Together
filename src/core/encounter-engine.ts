import { EncounterSession, EncounterState } from '../types';

export const RSSI_PROXIMITY_THRESHOLD = -78; // dBm (~2-3 meters under indoor BLE attenuation)
export const DEFAULT_GRACE_PERIOD_MS = 30000; // 30 seconds debounce before marking disconnected
export const ROTATING_ID_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes rotation

/**
 * Generates a privacy-preserving rotating ephemeral identifier (RPI)
 * Prevents third parties or eavesdroppers from tracking static device MAC or user ID.
 */
export function generateRotatingIdentifier(userId: string, epochTimestamp: number): string {
  const windowIndex = Math.floor(epochTimestamp / ROTATING_ID_INTERVAL_MS);
  let hash = 0;
  const input = `${userId}:${windowIndex}:together-ble-salt`;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `rpi-${hex}`;
}

/**
 * Validates whether an observed RSSI reading satisfies physical proximity threshold
 */
export function isWithinProximity(rssi: number, threshold = RSSI_PROXIMITY_THRESHOLD): boolean {
  return rssi >= threshold;
}

/**
 * Format duration seconds into friendly string (e.g. "1h 20m" or "45m")
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.max(0, Math.floor(seconds))}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${hours}h ${formattedMinutes}m`;
}

/**
 * Evaluates state machine transition for an ongoing or discovered encounter
 */
export function stepEncounterStateMachine(
  session: EncounterSession,
  event: 'BLE_ADVERTISEMENT_DETECTED' | 'SIGNAL_LOST' | 'HEARTBEAT' | 'VERIFICATION_SUCCESS' | 'FORCE_END',
  rssi: number,
  currentTimestamp: number,
  gracePeriodMs = DEFAULT_GRACE_PERIOD_MS
): EncounterSession {
  const updated: EncounterSession = { ...session };

  switch (session.state) {
    case 'DISCONNECTED':
    case 'ENDED':
      if (event === 'BLE_ADVERTISEMENT_DETECTED' && isWithinProximity(rssi)) {
        updated.state = 'DISCOVERED';
        updated.lastRssi = rssi;
        updated.stateUpdatedAt = currentTimestamp;
        updated.gracePeriodExpiresAt = undefined;
      }
      break;

    case 'DISCOVERED':
      if (event === 'VERIFICATION_SUCCESS') {
        updated.state = 'CONNECTED';
        updated.isMutualVerified = true;
        updated.stateUpdatedAt = currentTimestamp;
        updated.lastRssi = rssi;
      } else if (event === 'SIGNAL_LOST') {
        updated.state = 'DISCONNECTED';
        updated.stateUpdatedAt = currentTimestamp;
      }
      break;

    case 'VERIFYING':
      if (event === 'VERIFICATION_SUCCESS') {
        updated.state = 'CONNECTED';
        updated.isMutualVerified = true;
        updated.stateUpdatedAt = currentTimestamp;
      } else if (event === 'SIGNAL_LOST') {
        updated.state = 'DISCONNECTED';
        updated.stateUpdatedAt = currentTimestamp;
      }
      break;

    case 'CONNECTED':
      if (event === 'BLE_ADVERTISEMENT_DETECTED' || event === 'HEARTBEAT') {
        if (isWithinProximity(rssi)) {
          updated.lastRssi = rssi;
          // Calculate elapsed seconds since start
          const startMs = new Date(updated.startedAt).getTime();
          updated.durationSeconds = Math.max(0, Math.floor((currentTimestamp - startMs) / 1000));
          updated.gracePeriodExpiresAt = undefined;
        } else {
          // Signal dropped below threshold, enter TEMPORARILY_LOST
          updated.state = 'TEMPORARILY_LOST';
          updated.stateUpdatedAt = currentTimestamp;
          updated.gracePeriodExpiresAt = currentTimestamp + gracePeriodMs;
        }
      } else if (event === 'SIGNAL_LOST') {
        updated.state = 'TEMPORARILY_LOST';
        updated.stateUpdatedAt = currentTimestamp;
        updated.gracePeriodExpiresAt = currentTimestamp + gracePeriodMs;
      } else if (event === 'FORCE_END') {
        updated.state = 'ENDED';
        updated.endedAt = new Date(currentTimestamp).toISOString();
        updated.stateUpdatedAt = currentTimestamp;
      }
      break;

    case 'TEMPORARILY_LOST':
      if (event === 'BLE_ADVERTISEMENT_DETECTED' && isWithinProximity(rssi)) {
        // Recovered connection within grace period!
        updated.state = 'CONNECTED';
        updated.lastRssi = rssi;
        updated.stateUpdatedAt = currentTimestamp;
        updated.gracePeriodExpiresAt = undefined;
      } else if (currentTimestamp >= (session.gracePeriodExpiresAt || 0) || event === 'FORCE_END') {
        // Grace period expired, finalize encounter
        updated.state = 'ENDED';
        updated.endedAt = new Date(session.stateUpdatedAt).toISOString();
        updated.stateUpdatedAt = currentTimestamp;
        updated.gracePeriodExpiresAt = undefined;
      }
      break;
  }

  return updated;
}
