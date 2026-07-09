import { generateSecret, generateURI, verifySync } from 'otplib';
import * as qrcode from 'qrcode';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/db';
import { users } from '../db/schema/users';

export async function enable2FA(userId: string): Promise<{ secret: string; qrCode: string }> {
  const secret = generateSecret();
  const otpauth = generateURI({ issuer: 'Officia', label: userId, secret });
  const qrCode = await qrcode.toDataURL(otpauth);

  await db
    .update(users)
    .set({ twoFactorSecret: secret, twoFactorEnabled: false })
    .where(eq(users.id, userId));

  return { secret, qrCode };
}

export async function verify2FA(userId: string, token: string): Promise<boolean> {
  const [user] = await db
    .select({ twoFactorSecret: users.twoFactorSecret })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.twoFactorSecret) return false;

  const isValid = verifySync({ token, secret: user.twoFactorSecret }).valid;
  if (isValid) {
    await db
      .update(users)
      .set({ twoFactorEnabled: true })
      .where(eq(users.id, userId));
  }
  return isValid;
}
