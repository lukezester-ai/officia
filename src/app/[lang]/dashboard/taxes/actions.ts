'use server';
import { db } from '@/lib/db/db';
import { taxDeclarations } from '@/lib/db/schema/tax_declarations';
import { TaxEngine } from '@/lib/accounting/tax-engine';
import { desc, eq } from 'drizzle-orm';
import { requireTenant } from '@/lib/auth/get-tenant';

export async function getDeclarations() {
  try {
    const { tenantId } = await requireTenant();

    const records = await db.select()
      .from(taxDeclarations)
      .where(eq(taxDeclarations.tenantId, tenantId))
      .orderBy(desc(taxDeclarations.createdAt));

    return { success: true, data: records };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function generateDds(year: number, month: number) {
  try {
    const { tenantId } = await requireTenant();

    await TaxEngine.generateDDSDeclaration(tenantId, year, month);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function generateProfitTaxAction(year: number) {
  try {
    const { tenantId } = await requireTenant();

    await TaxEngine.generateProfitTax(tenantId, year);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

import { vatJournals } from '@/lib/db/schema/vat_journals';
import { employees } from '@/lib/db/schema/employees';
import { generateFullBatchNapZip } from '@/lib/accounting/nap-export';
import { and } from 'drizzle-orm';

/**
 * TICKET 7: Масов експорт на ДДС и ТРЗ декларации за НАП (PRODAJBI.TXT, POKUPKI.TXT, OBRAZEC_1_6.XML) в ZIP пакет.
 */
export async function exportBatchDeclarationsAction(
  year: number,
  month: number
): Promise<{ success: boolean; zipBase64?: string; error?: string }> {
  try {
    const { tenantId, tenant } = await requireTenant();

    const vatRecords = await db
      .select()
      .from(vatJournals)
      .where(
        and(
          eq(vatJournals.tenantId, tenantId),
          eq(vatJournals.periodYear, year),
          eq(vatJournals.periodMonth, month)
        )
      );

    const emps = await db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.isActive, true)
        )
      );

    const formattedVat = vatRecords.map((r: any) => ({
      id: r.id,
      type: r.type,
      periodYear: r.periodYear,
      periodMonth: r.periodMonth,
      entryDate: r.documentDate || new Date().toISOString(),
      documentNumber: r.documentNumber || '',
      counterpartyName: r.counterpartyName || '',
      counterpartyVat: r.counterpartyVat || '',
      invoiceNumber: r.documentNumber || '',
      invoiceDate: r.documentDate || '',
      netAmount: parseFloat(r.netAmount || '0'),
      vatAmount: parseFloat(r.vatAmount || '0'),
      totalAmount: parseFloat(r.netAmount || '0') + parseFloat(r.vatAmount || '0'),
      vatRate: parseFloat(r.vatRate || '20'),
    }));

    const formattedEmps = emps.map((e: any) => {
      const gross = parseFloat(e.salary || '0');
      const insBase = Math.min(gross, 3750);
      return {
        pin: e.egn || '0000000000',
        firstName: e.firstName || '',
        lastName: e.lastName || '',
        grossSalary: gross,
        insuranceBase: insBase,
        dooEmp: insBase * 0.079,
        dzpoEmp: insBase * 0.028,
        zoEmp: insBase * 0.022,
        ddfl: Math.max(0, gross - insBase * 0.129) * 0.10,
      };
    });

    const zipBuffer = await generateFullBatchNapZip(
      formattedVat as any,
      formattedEmps,
      (tenant as any)?.vatNumber || 'BG123456789',
      year,
      month
    );

    return {
      success: true,
      zipBase64: zipBuffer.toString('base64'),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

