import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { vatJournals } from '@/lib/db/schema/vat_journals';
import { requireTenant } from '@/lib/auth/get-tenant';
import { generateNapExportArchive } from '@/lib/accounting/nap-export';
import { and, eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { tenantId, tenant } = await requireTenant();

    const searchParams = req.nextUrl.searchParams;
    const yearStr = searchParams.get('year');
    const monthStr = searchParams.get('month');

    if (!yearStr || !monthStr) {
      return new NextResponse('Year and month are required', { status: 400 });
    }

    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    if (isNaN(year) || isNaN(month)) {
      return new NextResponse('Invalid year or month', { status: 400 });
    }

    // Взимаме всички ДДС записи за съответния месец
    const records = await db
      .select()
      .from(vatJournals)
      .where(
        and(
          eq(vatJournals.tenantId, tenantId),
          eq(vatJournals.periodYear, year),
          eq(vatJournals.periodMonth, month)
        )
      );

    const companyVat = tenant?.vatNumber || tenant?.bulstat || 'BG000000000';

    // Генерираме ZIP архива (Buffer)
    const zipBuffer = await generateNapExportArchive(
      records as any[], // Използваме any тук заради леки разлики в numeric типовете
      companyVat,
      year,
      month
    );

    const filename = `NAP_VAT_${year}_${String(month).padStart(2, '0')}.zip`;

    // Връщаме ZIP файла като изтегляне
    return new NextResponse(zipBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('[VAT_EXPORT_ERROR]', error);
    if (error.message === 'Not authenticated' || error.message.includes('tenant')) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
