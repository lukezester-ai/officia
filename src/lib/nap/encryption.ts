// src/lib/nap/encryption.ts
// AES-256-GCM encryption for NAP API keys

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(
  process.env.NAP_ENCRYPTION_KEY || "",
  "hex"
);

/**
 * Encrypts a plain-text API key using AES-256-GCM.
 * Returns the encrypted value and the IV (both as hex strings).
 */
export function encryptApiKey(plaintext: string): { encrypted: string; iv: string } {
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Store authTag appended to encrypted data
  const combined = Buffer.concat([encrypted, authTag]);

  return {
    encrypted: combined.toString("hex"),
    iv: iv.toString("hex"),
  };
}

/**
 * Decrypts an encrypted API key using AES-256-GCM.
 */
export function decryptApiKey(encryptedHex: string, ivHex: string): string {
  const iv = Buffer.from(ivHex, "hex");
  const combined = Buffer.from(encryptedHex, "hex");

  // Last 16 bytes are the auth tag
  const authTag = combined.subarray(combined.length - 16);
  const encrypted = combined.subarray(0, combined.length - 16);

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
