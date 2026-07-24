import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function getEncryptionKey() {
  const key = process.env.NAP_ENCRYPTION_KEY;
  if (!key || key.length !== 32) {
    console.error('CRITICAL: NAP_ENCRYPTION_KEY must be exactly 32 characters long in .env.local');
    // We throw to prevent saving unrecoverable or insecure data
    throw new Error('NAP_ENCRYPTION_KEY is missing or invalid length.');
  }
  return key;
}

export function encryptApiKey(apiKey: string) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key), iv);
  
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // We store the authTag with the encrypted string to simplify db schema
  // format: <authTag>:<encryptedData>
  return {
    encrypted: `${authTag}:${encrypted}`,
    iv: iv.toString('hex')
  };
}

export function decryptApiKey(encryptedData: string, ivHex: string) {
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  
  const [authTagHex, encrypted] = encryptedData.split(':');
  if (!authTagHex || !encrypted) {
    throw new Error('Invalid encrypted data format');
  }
  
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
