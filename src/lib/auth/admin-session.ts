import { cookies } from 'next/headers';
import { createAdminToken, credentialsMatch, readAdminToken } from '@/lib/auth/admin-token';

const COOKIE = 'officia_admin';
const MAX_AGE = 14 * 24 * 60 * 60;

function adminPassword() {
  return process.env.OFFICIA_ADMIN_PASSWORD?.trim() ?? '';
}

function sessionSecret() {
  return process.env.OFFICIA_ADMIN_SESSION_SECRET?.trim() ?? '';
}

export function adminLoginConfigured() {
  return adminPassword().length >= 12 && sessionSecret().length >= 16;
}

export function adminCredentialsMatch(username: string, password: string) {
  if (!adminLoginConfigured()) return false;
  return credentialsMatch(username, password, adminPassword());
}

export async function hasAdminSession() {
  const secret = sessionSecret();
  if (!secret) return false;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;
  return readAdminToken(token, secret);
}

export async function startAdminSession() {
  const secret = sessionSecret();
  if (!secret) throw new Error('Admin session is not configured');
  (await cookies()).set(COOKIE, createAdminToken(secret), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function clearAdminSession() {
  (await cookies()).delete(COOKIE);
}
