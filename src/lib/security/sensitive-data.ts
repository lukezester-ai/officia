import 'server-only';

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';

function encryptionKey(): Buffer {
  const configured = process.env.PERSONAL_DATA_ENCRYPTION_KEY;
  if (!configured || configured.length < 32) {
    throw new Error('PERSONAL_DATA_ENCRYPTION_KEY трябва да съдържа поне 32 символа.');
  }
  return createHash('sha256').update(configured, 'utf8').digest();
}

export function normalizePersonalIdentifier(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

export function hashSensitive(value: string, tenantId: string): string {
  return createHmac('sha256', encryptionKey())
    .update(`${tenantId}:${normalizePersonalIdentifier(value)}`, 'utf8')
    .digest('hex');
}

export function encryptSensitive(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join(':');
}

export function decryptSensitive(payload: string): string {
  const [version, iv, tag, encrypted] = payload.split(':');
  if (version !== 'v1' || !iv || !tag || !encrypted) throw new Error('Невалиден формат на защитените данни.');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8');
}
