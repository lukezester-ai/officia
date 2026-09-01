import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function requireApiUser() {
  const { userId } = await auth();
  if (!userId) {
    return { userId: null, response: NextResponse.json({ error: 'Неоторизиран достъп' }, { status: 401 }) };
  }
  return { userId, response: null };
}

export function requireBearerSecret(req: Request, secret: string | undefined) {
  if (!secret) return NextResponse.json({ error: 'Услугата не е конфигурирана' }, { status: 503 });
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Неоторизиран достъп' }, { status: 401 });
  }
  return null;
}

export function rejectOversizedRequest(req: Request, maxBytes: number) {
  const length = Number(req.headers.get('content-length') ?? 0);
  return Number.isFinite(length) && length > maxBytes
    ? NextResponse.json({ error: 'Заявката е твърде голяма' }, { status: 413 })
    : null;
}
