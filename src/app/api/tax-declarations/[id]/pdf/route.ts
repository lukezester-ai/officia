import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { taxDeclarations } from '@/lib/db/schema/tax_declarations';
import { and, eq } from 'drizzle-orm';
import { requireTenant } from '@/lib/auth/get-tenant';
import { generateTaxDeclarationPdf } from '@/lib/reports/exporter';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { tenantId, tenant } = await requireTenant();
    const { id } = await context.params;

    const [declaration] = await db
      .select()
      .from(taxDeclarations)
      .where(and(eq(taxDeclarations.id, id), eq(taxDeclarations.tenantId, tenantId)));

    if (!declaration) {
      return NextResponse.json({ error: 'Declaration not found' }, { status: 404 });
    }

    const pdf = generateTaxDeclarationPdf({
      type: declaration.type,
      periodStart: declaration.periodStart,
      periodEnd: declaration.periodEnd,
      totalAmount: declaration.totalAmount,
      status: declaration.status,
      companyName: tenant?.name ?? 'Officia',
    });

    const filename = `tax-${declaration.type}-${declaration.periodStart ?? declaration.id}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    if (error.message === 'Not authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Failed to export PDF' }, { status: 500 });
  }
}
