import { db } from '@/lib/db/db';
import { taxDeclarations } from '@/lib/db/schema/tax_declarations';
import { vatJournals } from '@/lib/db/schema/vat_journals';
import { ReportEngine } from './report-engine';
import { eq, and, sql } from 'drizzle-orm';

export class TaxEngine {

  // ДДС декларация (по година и месец)
  static async generateDDSDeclaration(tenantId: string, year: number, month: number) {
    // Начало и край на месеца
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0); // последен ден на месеца

    const sales = await this.getVATTotal(tenantId, 'sales', year, month);
    const purchases = await this.getVATTotal(tenantId, 'purchases', year, month);

    const payableVAT = sales - purchases;

    const report = {
      periodStart: periodStart.toISOString().split('T')[0],
      periodEnd: periodEnd.toISOString().split('T')[0],
      salesVAT: sales,
      purchasesVAT: purchases,
      payableVAT: payableVAT,
      rate: 20, // 20% стандартна ставка
    };

    // Запис в базата
    const result = await db.insert(taxDeclarations).values({
      tenantId,
      type: 'dds',
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      totalAmount: payableVAT.toString(),
      data: report,
      status: 'draft',
    }).returning();

    return result[0];
  }

  // Данък печалба (Corporate Tax)
  static async generateProfitTax(tenantId: string, year: number) {
    const periodStart = new Date(year, 0, 1);
    const periodEnd = new Date(year, 11, 31);

    // Извличане на PnL от съществуващия ReportEngine
    const pnl = await ReportEngine.generatePnL(tenantId, periodStart, periodEnd);
    const accountingProfit = pnl.netProfit;

    const report = {
      year,
      accountingProfit: accountingProfit,
      taxableProfit: accountingProfit, // тук могат да се прилагат данъчни преобразувания в бъдеще
      taxRate: 10,
      taxAmount: accountingProfit > 0 ? accountingProfit * 0.10 : 0,
    };

    const result = await db.insert(taxDeclarations).values({
      tenantId,
      type: 'profit_tax',
      periodStart: periodStart.toISOString().split('T')[0],
      periodEnd: periodEnd.toISOString().split('T')[0],
      totalAmount: report.taxAmount.toString(),
      data: report,
      status: 'draft'
    }).returning();

    return result[0];
  }

  // Помощен метод за сумиране на ДДС от vatJournals
  private static async getVATTotal(tenantId: string, type: 'sales' | 'purchases', year: number, month: number): Promise<number> {
    const result = await db.select({
      totalVAT: sql<number>`COALESCE(SUM(${vatJournals.vatAmount}), 0)`
    })
    .from(vatJournals)
    .where(and(
      eq(vatJournals.tenantId, tenantId),
      eq(vatJournals.type, type),
      eq(vatJournals.periodYear, year),
      eq(vatJournals.periodMonth, month)
    ));

    return Number(result[0]?.totalVAT || 0);
  }

  // ==================== XML ЕКСПОРТ ЗА НАП ====================
  static async generateDDSXml(declarationId: string) {
    const declarations = await db.select().from(taxDeclarations).where(eq(taxDeclarations.id, declarationId));
    const declaration = declarations[0];

    if (!declaration) throw new Error("Декларацията не е намерена");

    // Взимаме данните за фирмата (tenant)
    const { tenants } = await import('@/lib/db/schema/tenants');
    const tenantRecords = await db.select().from(tenants).where(eq(tenants.id, declaration.tenantId));
    const company = tenantRecords[0] || { bulstat: '', name: 'Неизвестна фирма', address: '' };

    const xml = this.buildDDSXmlForNAP(declaration.data, company);
    return xml;
  }

  private static buildDDSXmlForNAP(data: any, company: any): string {
    const salesVAT = Number(data.salesVAT) || 0;
    const purchasesVAT = Number(data.purchasesVAT) || 0;
    const payableVAT = Number(data.payableVAT) || 0;

    return `<?xml version="1.0" encoding="UTF-8"?>
<Декларация xmlns="http://nap.bg">
  <Идентификация>
    <ЕИК>${company.bulstat || ''}</ЕИК>
    <Име>${company.name}</Име>
    <Адрес>${company.address || ''}</Адрес>
  </Идентификация>

  <Период>
    <Начало>${data.periodStart}</Начало>
    <Край>${data.periodEnd}</Край>
  </Период>

  <Данни>
    <Продажби>
      <Общо>${salesVAT.toFixed(2)}</Общо>
      <Облагаеми>${(salesVAT / 0.2).toFixed(2)}</Облагаеми>
    </Продажби>

    <Покупки>
      <Общо>${purchasesVAT.toFixed(2)}</Общо>
      <Облагаеми>${(purchasesVAT / 0.2).toFixed(2)}</Облагаеми>
    </Покупки>

    <Резултат>
      <ДДСЗаПлащане>${(payableVAT > 0 ? payableVAT : 0).toFixed(2)}</ДДСЗаПлащане>
      <ДДСЗаВъзстановяване>${(payableVAT < 0 ? Math.abs(payableVAT) : 0).toFixed(2)}</ДДСЗаВъзстановяване>
    </Резултат>
  </Данни>

  <Подпис>
    <Дата>${new Date().toISOString().slice(0, 10)}</Дата>
    <Име>Управител</Име>
  </Подпис>
</Декларация>`;
  }
}
