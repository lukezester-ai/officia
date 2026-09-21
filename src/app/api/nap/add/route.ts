import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { napIntegrations } from '@/lib/db/schema/nap-integrations';
import { encryptApiKey } from '@/lib/nap/encryption';
import { requireTenant } from '@/lib/auth/get-tenant';
import { withRateLimit } from '@/lib/api/rate-limit';

export async function POST(req: Request) {
  return withRateLimit(req, () => addNapIntegration(req));
}

async function addNapIntegration(req: Request) {
  try {
    const { tenantId, userId } = await requireTenant();
    const { eik, apiKey } = await req.json();

    if (!eik || !apiKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { encrypted, iv } = encryptApiKey(apiKey);
    const [record] = await db
      .insert(napIntegrations)
      .values({
        id: crypto.randomUUID(),
        organizationId: tenantId,
        eik,
        encryptedApiKey: encrypted,
        encryptionIv: iv,
        connectedByUserId: userId,
        status: 'active',
      })
      .returning();

    return NextResponse.json({ success: true, integrationId: record.id }, { status: 201 });
  } catch (err: any) {
    console.error('[NAP Add] error', err);
    return NextResponse.json({ error: 'Unexpected error', details: err.message }, { status: 500 });
  }
}
