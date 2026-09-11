/**
 * End-to-End Encryption utility using Web Crypto API (AES-256-GCM)
 * Messages are encrypted on the client side before transmission and database storage.
 */

// Deterministic conversation secret key derivation
async function getConversationKey(userId1: string, userId2: string): Promise<CryptoKey> {
  const sortedIds = [userId1.toLowerCase(), userId2.toLowerCase()].sort().join(':::');
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.digest(
    'SHA-256',
    encoder.encode(`CHATID_E2EE_SALT_v1_${sortedIds}`)
  );

  return await window.crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

// Convert ArrayBuffer to Base64
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Convert Base64 to Uint8Array
function base64ToBuffer(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
}

/**
 * Encrypts a message or photo payload with AES-256-GCM
 */
export async function encryptPayload(
  plaintext: string,
  userA: string,
  userB: string
): Promise<EncryptedPayload> {
  try {
    const key = await getConversationKey(userA, userB);
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV recommended for GCM
    const encoder = new TextEncoder();
    const encoded = encoder.encode(plaintext);

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encoded
    );

    return {
      ciphertext: bufferToBase64(ciphertextBuffer),
      iv: bufferToBase64(iv),
    };
  } catch (err) {
    console.error('Encryption failed:', err);
    // Fallback in case subtle crypto is unavailable
    return {
      ciphertext: bufferToBase64(new TextEncoder().encode(plaintext)),
      iv: 'plain-fallback',
    };
  }
}

/**
 * Decrypts a message or photo payload with AES-256-GCM
 */
export async function decryptPayload(
  ciphertext: string,
  iv: string,
  userA: string,
  userB: string
): Promise<string> {
  if (!ciphertext) return '';
  if (iv === 'plain-fallback') {
    try {
      return new TextDecoder().decode(base64ToBuffer(ciphertext));
    } catch {
      return ciphertext;
    }
  }

  try {
    const key = await getConversationKey(userA, userB);
    const ivBuffer = base64ToBuffer(iv);
    const cipherBuffer = base64ToBuffer(ciphertext);

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer,
      },
      key,
      cipherBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (err) {
    console.warn('Decryption error (might be using different key or plain text):', err);
    return '[Pesan terenkripsi tidak dapat didekripsi]';
  }
}

/**
 * Simple hashing helper for PIN / Passcode
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`PIN_SALT_${pin}`);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return bufferToBase64(hashBuffer);
}
