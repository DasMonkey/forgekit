/**
 * Encryption utilities for Craftus
 * Handles API key encryption/decryption for secure storage
 * 
 * NOTE: This is a simple obfuscation for MVP (client-side only)
 * In production with a backend, use proper encryption (AES-256-GCM)
 * and store keys server-side only
 */

/**
 * Encrypts an API key for storage
 * Uses base64 encoding with timestamp obfuscation for MVP
 */
export const encryptApiKey = (apiKey: string): string => {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('Invalid API key');
  }

  try {
    // Add timestamp for uniqueness
    const timestamp = Date.now().toString();
    const combined = `${apiKey}:${timestamp}`;
    
    // Base64 encode
    const encoded = btoa(combined);
    
    // Add a simple prefix to identify encrypted keys
    return `craftus_enc_${encoded}`;
  } catch (error) {
    console.error('Failed to encrypt API key:', error);
    throw new Error('Encryption failed');
  }
};

/**
 * Decrypts an API key from storage
 */
export const decryptApiKey = (encrypted: string): string => {
  if (!encrypted || typeof encrypted !== 'string') {
    throw new Error('Invalid encrypted data');
  }

  try {
    // Remove prefix
    if (!encrypted.startsWith('craftus_enc_')) {
      throw new Error('Invalid encrypted format');
    }

    const encoded = encrypted.replace('craftus_enc_', '');
    
    // Base64 decode
    const decoded = atob(encoded);
    
    // Extract API key (before the colon)
    const parts = decoded.split(':');
    if (parts.length < 2) {
      throw new Error('Invalid encrypted format');
    }

    return parts[0];
  } catch (error) {
    console.error('Failed to decrypt API key:', error);
    throw new Error('Decryption failed');
  }
};

/**
 * Validates API key format (Gemini API key pattern)
 * Gemini API keys typically start with "AIza" and are 39 characters
 */
export const validateApiKeyFormat = (apiKey: string): boolean => {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  // Check length (Gemini keys are typically 39 characters)
  if (apiKey.length < 30 || apiKey.length > 50) {
    return false;
  }

  // Check if it starts with common Gemini prefix
  if (!apiKey.startsWith('AIza')) {
    return false;
  }

  // Check for valid characters (alphanumeric, dash, underscore)
  const validPattern = /^[A-Za-z0-9_-]+$/;
  if (!validPattern.test(apiKey)) {
    return false;
  }

  return true;
};

/**
 * Masks an API key for display
 * Shows first 4 and last 4 characters, masks the rest
 */
export const maskApiKey = (apiKey: string): string => {
  if (!apiKey || typeof apiKey !== 'string') {
    return '';
  }

  if (apiKey.length <= 8) {
    return '••••••••';
  }

  const first = apiKey.substring(0, 4);
  const last = apiKey.substring(apiKey.length - 4);
  const masked = '•'.repeat(apiKey.length - 8);

  return `${first}${masked}${last}`;
};

/**
 * Generates a random encryption key (for future use)
 * Not used in MVP but included for future backend integration
 */
export const generateEncryptionKey = async (): Promise<CryptoKey> => {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
};

/**
 * Encrypts data using Web Crypto API (for future use)
 * Not used in MVP but included for future backend integration
 */
export const encryptWithWebCrypto = async (
  data: string,
  key: CryptoKey
): Promise<{ encrypted: string; iv: string }> => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    dataBuffer
  );

  // Convert to base64
  const encryptedArray = Array.from(new Uint8Array(encryptedBuffer));
  const encrypted = btoa(String.fromCharCode(...encryptedArray));
  
  const ivArray = Array.from(iv);
  const ivBase64 = btoa(String.fromCharCode(...ivArray));

  return { encrypted, iv: ivBase64 };
};

/**
 * Decrypts data using Web Crypto API (for future use)
 * Not used in MVP but included for future backend integration
 */
export const decryptWithWebCrypto = async (
  encrypted: string,
  ivBase64: string,
  key: CryptoKey
): Promise<string> => {
  // Convert from base64
  const encryptedArray = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));

  // Decrypt
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encryptedArray
  );

  // Convert to string
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
};
