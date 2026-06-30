import { NextResponse } from 'next/server';
import { requireTenant, withTenantDb } from '@/lib/auth/get-tenant';
import { requirePermission } from '@/lib/auth/rbac';
import { db } from '@/lib/db/db';
import { vatJournals } from '@/lib/db/schema/vat_journals';
import { napSubmissions } from '@/lib/db/schema/access';
import { generateNapExportArchive } from '@/lib/accounting/nap-export';
import { submitVatZipToNap } from '@/lib/e-invoice/submit-vat-nap';
import { and, eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { tenantId, tenant, user } = await requireTenant();
    const perm = await requirePermission(tenantId, user.id, 'vat:export');
    if (!perm.ok) {
      return NextResponse.json({ success: false, error: perm.error }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const now = new Date();
    const year = Number(body.year) || now.getFullYear();
    const month = Number(body.month) || now.getMonth() + 1;

    const records = await withTenantDb(async (tx) =>
      tx
        .select()
        .from(vatJournals)
        .where(
          and(
            eq(vatJournals.tenantId, tenantId),
            eq(vatJournals.periodYear, year),
            eq(vatJournals.periodMonth, month),
          ),
        ),
    );

    if (records.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Няма ДДС записи за избрания период.' },
        { status: 400 },
      );
    }

    const mapped = records.map((r) => ({
      id: r.id,
      type: r.type as 'sales' | 'purchases',
      periodYear: r.periodYear,
      periodMonth: r.periodMonth,
      entryDate: String(r.entryDate),
      documentNumber: r.documentNumber || '',
      counterpartyName: r.counterpartyName || '',
      counterpartyVat: r.counterpartyVat || '',
      invoiceNumber: r.invoiceNumber || '',
      invoiceDate: r.invoiceDate ? String(r.invoiceDate) : '',
      netAmount: Number(r.netAmount || 0),
      vatAmount: Number(r.vatAmount || 0),
      totalAmount: Number(r.totalAmount || 0),
      vatRate: r.vatRate || 20,
      isIntraCommunity: r.isIntraCommunity || false,
    }));

    const companyVat = tenant?.vatNumber || tenant?.bulstat || 'BG000000000';
    const zipBuffer = await generateNapExportArchive(mapped, companyVat, year, month);
    const filename = `NAP_VAT_${year}_${String(month).padStart(2, '0')}.zip`;

    const result = await submitVatZipToNap({ zipBuffer, filename, year, month });

    if (!result.success) {
      return NextResponse.json(result, { status: result.mode === 'disabled' ? 503 : 502 });
    }

    await withTenantDb(async (tx) =>
      tx.insert(napSubmissions).values({
        tenantId,
        periodYear: year,
        periodMonth: month,
        referenceNumber: result.referenceNumber,
        mode: result.mode,
        status: 'submitted',
        submittedBy: user.id,
      }),
    );

    return NextResponse.json({
      success: true,
      mode: result.mode,
      referenceNumber: result.referenceNumber,
      year,
      month,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Submission failed';
    if (message === 'Not authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
