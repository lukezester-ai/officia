import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { requireTenant } from '@/lib/auth/get-tenant';
import { contractFileLabel, resolveContractFile } from '@/lib/contracts/files';
import { db } from '@/lib/db/db';
import { contractVersions } from '@/lib/db/schema/contracts';
import { parseUuidParam } from '@/lib/utils/ids';

export async function GET(_req: Request, props: { params: Promise<{ id: string; versionId: string }> }) {
  const { tenantId } = await requireTenant();
  const params = await props.params;
  const contractId = parseUuidParam(params.id);
  const versionId = parseUuidParam(params.versionId);
  if (!contractId || !versionId) return new NextResponse('Невалиден адрес', { status: 400 });

  const [version] = await db.select().from(contractVersions).where(and(
    eq(contractVersions.id, versionId),
    eq(contractVersions.contractId, contractId),
    eq(contractVersions.tenantId, tenantId),
  )).limit(1);
  if (!version?.contentUrl) return new NextResponse('Файлът липсва', { status: 404 });

  try {
    const bytes = await readFile(resolveContractFile(version.contentUrl));
    const name = contractFileLabel(version.contentUrl) || 'contract';
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${path.basename(name).replace(/"/g, '')}"`,
      },
    });
  } catch (error) {
    console.error('[contract-file-download]', error);
    return new NextResponse('Файлът липсва', { status: 404 });
  }
}
