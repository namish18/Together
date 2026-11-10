import { TimeCapsuleMessage, UnlockConditionType } from '../types';

/**
 * Returns unlock delay in seconds based on condition type
 */
export function getUnlockDelaySeconds(condition: UnlockConditionType): number {
  switch (condition) {
    case 'ON_DISCONNECT':
      return 0;
    case 'DELAY_5_MINUTES':
      return 5 * 60;
    case 'DELAY_30_MINUTES':
      return 30 * 60;
    case 'DELAY_1_HOUR':
      return 60 * 60;
    case 'DELAY_24_HOURS':
      return 24 * 60 * 60;
    case 'SPECIFIC_DATETIME':
      return 0;
  }
}

/**
 * Simple browser & Node compatible reversible AES-GCM simulation or mock base64 obfuscation for testing,
 * with actual WebCrypto implementation when window.crypto is present.
 */
export async function encryptCapsulePayload(plaintext: string, secretKey: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const enc = new TextEncoder();
      const rawKey = await crypto.subtle.digest('SHA-256', enc.encode(secretKey));
      const key = await crypto.subtle.importKey(
        'raw',
        rawKey,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode(plaintext)
      );

      // Pack IV + ciphertext into base64
      const combined = new Uint8Array(iv.length + ciphertext.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(ciphertext), iv.length);
      
      let binary = '';
      for (let i = 0; i < combined.length; i++) {
        binary += String.fromCharCode(combined[i]);
      }
      return typeof btoa !== 'undefined' 
        ? btoa(binary) 
        : (typeof Buffer !== 'undefined' ? Buffer.from(binary, 'binary').toString('base64') : binary);
    } catch {
      // fallback
    }
  }
  // Deterministic fallback for non-crypto environments
  const encoded = typeof btoa !== 'undefined' 
    ? btoa(encodeURIComponent(plaintext)) 
    : (typeof Buffer !== 'undefined' ? Buffer.from(plaintext).toString('base64') : plaintext);
  return `enc_${encoded}`;
}

export async function decryptCapsulePayload(encryptedBase64: string, secretKey: string): Promise<string> {
  if (encryptedBase64.startsWith('enc_')) {
    const raw = encryptedBase64.slice(4);
    try {
      if (typeof atob !== 'undefined') {
        const decoded = atob(raw);
        try {
          return decodeURIComponent(decoded);
        } catch {
          return decoded;
        }
      }
      if (typeof Buffer !== 'undefined') {
        return Buffer.from(raw, 'base64').toString('utf-8');
      }
    } catch {
      return raw;
    }
    return raw;
  }

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const binary = typeof atob !== 'undefined' 
        ? atob(encryptedBase64) 
        : (typeof Buffer !== 'undefined' ? Buffer.from(encryptedBase64, 'base64').toString('binary') : encryptedBase64);
      
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const iv = bytes.slice(0, 12);
      const ciphertext = bytes.slice(12);

      const enc = new TextEncoder();
      const rawKey = await crypto.subtle.digest('SHA-256', enc.encode(secretKey));
      const key = await crypto.subtle.importKey(
        'raw',
        rawKey,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
      );
      return new TextDecoder().decode(decrypted);
    } catch {
      return '[Decryption failed: Key mismatch]';
    }
  }

  return '[Decrypted message]';
}

/**
 * Checks whether a secret time capsule is ready to be opened.
 * @param capsule The message
 * @param nowTimestamp Current epoch timestamp in ms
 * @param isCurrentlyInProximity Whether the sender and recipient are currently proximate
 */
export function checkCapsuleUnlockStatus(
  capsule: TimeCapsuleMessage,
  nowTimestamp: number,
  isCurrentlyInProximity: boolean
): { isReady: boolean; remainingSeconds: number; reason: string } {
  if (capsule.isUnlocked) {
    return { isReady: true, remainingSeconds: 0, reason: 'Already unlocked' };
  }

  if (capsule.unlockType === 'SPECIFIC_DATETIME' && capsule.specificUnlockTime) {
    const targetMs = new Date(capsule.specificUnlockTime).getTime();
    if (nowTimestamp >= targetMs) {
      return { isReady: true, remainingSeconds: 0, reason: 'Unlock time reached' };
    }
    const remSec = Math.max(0, Math.ceil((targetMs - nowTimestamp) / 1000));
    return { isReady: false, remainingSeconds: remSec, reason: `Unlocks at ${new Date(targetMs).toLocaleTimeString()}` };
  }

  // Disconnection-based triggers:
  // If still in proximity, the capsule must remain locked!
  if (isCurrentlyInProximity) {
    return {
      isReady: false,
      remainingSeconds: capsule.unlockDelaySeconds,
      reason: 'Locked while you are together. Will unlock after parting ways.'
    };
  }

  // If disconnected, check if disconnect timestamp was set
  if (!capsule.disconnectTimestamp) {
    return {
      isReady: false,
      remainingSeconds: capsule.unlockDelaySeconds,
      reason: 'Awaiting encounter conclusion'
    };
  }

  const elapsedSinceDisconnectSec = Math.floor((nowTimestamp - capsule.disconnectTimestamp) / 1000);
  const remainingSec = capsule.unlockDelaySeconds - elapsedSinceDisconnectSec;

  if (remainingSec <= 0) {
    return { isReady: true, remainingSeconds: 0, reason: 'Unlock condition met!' };
  }

  return {
    isReady: false,
    remainingSeconds: remainingSec,
    reason: `Unlocks in ${Math.ceil(remainingSec / 60)} minutes`
  };
}
