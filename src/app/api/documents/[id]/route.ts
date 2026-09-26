import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { requireTenant } from '@/lib/auth/get-tenant';
import { archiveFileLabel, resolveArchiveFile } from '@/lib/documents/files';
import { db } from '@/lib/db/db';
import { documents } from '@/lib/db/schema/documents';
import { parseUuidParam } from '@/lib/utils/ids';

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { tenantId } = await requireTenant();
  const params = await props.params;
  const id = parseUuidParam(params.id);
  if (!id) return new NextResponse('Невалиден адрес', { status: 400 });

  const [doc] = await db.select().from(documents).where(and(
    eq(documents.id, id),
    eq(documents.tenantId, tenantId),
  )).limit(1);
  if (!doc?.fileUrl) return new NextResponse('Файлът липсва', { status: 404 });

  try {
    const bytes = await readFile(resolveArchiveFile(doc.fileUrl));
    const name = archiveFileLabel(doc.fileUrl) || 'document';
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${path.basename(name).replace(/"/g, '')}"`,
      },
    });
  } catch (error) {
    console.error('[archive-file-download]', error);
    return new NextResponse('Файлът липсва', { status: 404 });
  }
}
