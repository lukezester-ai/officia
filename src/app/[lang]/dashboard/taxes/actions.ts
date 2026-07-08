'use server';
import { db } from '@/lib/db/db';
import { taxDeclarations } from '@/lib/db/schema/tax_declarations';
import { TaxEngine } from '@/lib/accounting/tax-engine';
import { and, desc, eq } from 'drizzle-orm';
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

export async function generateObra1(year: number, month: number) {
  try {
    const { tenantId } = await requireTenant();
    await TaxEngine.generateObra1Declaration(tenantId, year, month);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function generateObra6(year: number, month: number) {
  try {
    const { tenantId } = await requireTenant();
    await TaxEngine.generateObra6Declaration(tenantId, year, month);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function generateVies(year: number, month: number) {
  try {
    const { tenantId } = await requireTenant();
    await TaxEngine.generateViesDeclaration(tenantId, year, month);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function exportPayrollNapXml(declarationId: string) {
  try {
    const { tenantId } = await requireTenant();
    const [declaration] = await db
      .select()
      .from(taxDeclarations)
      .where(and(eq(taxDeclarations.id, declarationId), eq(taxDeclarations.tenantId, tenantId)));

    if (!declaration) return { success: false, error: 'Декларацията не е намерена' };

    let xml: string;
    if (declaration.type === 'obra1') {
      xml = await TaxEngine.generateObra1Xml(declarationId);
    } else if (declaration.type === 'obra6') {
      xml = await TaxEngine.generateObra6Xml(declarationId);
    } else {
      return { success: false, error: 'Невалиден тип декларация' };
    }

    const fileName = `${declaration.type}_${declaration.periodStart}_${declaration.periodEnd}.xml`;
    return { success: true, xml, fileName };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

