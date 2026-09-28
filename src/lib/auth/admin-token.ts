import { createHmac, timingSafeEqual } from 'crypto';

const SESSION_MS = 14 * 24 * 60 * 60 * 1000;
export const ADMIN_USERNAME = 'admin';

function digest(value: string) {
  return createHmac('sha256', 'officia-admin-login').update(value).digest();
}

export function credentialsMatch(username: string, password: string, expectedPassword: string) {
  const userOk = timingSafeEqual(digest(username), digest(ADMIN_USERNAME));
  const passOk = timingSafeEqual(digest(password), digest(expectedPassword));
  return userOk && passOk && expectedPassword.length > 0;
}

export function createAdminToken(secret: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ role: 'admin', exp: now + SESSION_MS })).toString('base64url');
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function readAdminToken(token: string, secret: string, now = Date.now()) {
  const [payload, sig] = token.split('.');
  if (!payload || !sig || token.split('.').length !== 2) return false;
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  const actual = Buffer.from(sig);
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { role?: string; exp?: number };
    return data.role === 'admin' && typeof data.exp === 'number' && data.exp > now;
  } catch {
    return false;
  }
}
