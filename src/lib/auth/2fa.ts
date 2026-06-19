// @ts-nocheck
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema/users';

// Mock DB wrapper (докато не импортираме реалната връзка)
const db = {
  update: (table: any) => ({
    set: (data: any) => ({
      where: async (condition: any) => { return true; }
    })
  }),
  select: () => ({
    from: (table: any) => ({
      where: (condition: any) => ({
        get: async () => ({ id: 'mock', twoFactorSecret: 'mock_secret' })
      })
    })
  })
};

export async function enable2FA(userId: string): Promise<{ secret: string; qrCode: string }> {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(userId, 'Officia', secret);
  const qrCode = await qrcode.toDataURL(otpauth);
  
  await db.update(users)
    .set({ twoFactorSecret: secret, twoFactorEnabled: false })
    .where(eq(users.id, userId));
  
  return { secret, qrCode };
}

export async function verify2FA(userId: string, token: string): Promise<boolean> {
  const user: any = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user.twoFactorSecret) return false;
  
  const isValid = authenticator.verify({ token, secret: user.twoFactorSecret });
  if (isValid) {
    await db.update(users)
      .set({ twoFactorEnabled: true })
      .where(eq(users.id, userId));
  }
  return isValid;
}
