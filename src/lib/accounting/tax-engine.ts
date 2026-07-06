import { db } from '@/lib/db/db';
import { taxDeclarations } from '@/lib/db/schema/tax_declarations';
import { vatJournals } from '@/lib/db/schema/vat_journals';
import { payrollBatches, payrollItems } from '@/lib/db/schema/payroll';
import { ReportEngine } from './report-engine';
import { eq, and, sql, sum } from 'drizzle-orm';

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

  // Обр. 1 — Осигурителна декларация (месечна)
  static async generateObra1Declaration(tenantId: string, year: number, month: number) {
    const monthStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const periodEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const [batch] = await db.select()
      .from(payrollBatches)
      .where(and(
        eq(payrollBatches.tenantId, tenantId),
        eq(payrollBatches.month, monthStr)
      ));

    if (!batch) throw new Error(`Няма изчислен ТРЗ за ${month}/${year}`);

    const items = await db.select()
      .from(payrollItems)
      .where(eq(payrollItems.batchId, batch.id));

    const employees = items.map(item => ({
      name: item.employeeName,
      insuranceBase: Number(item.insuranceBase),
      employeeDoo: Number(item.employeeDoo),
      employeeHealth: Number(item.employeeHealth),
      employerDoo: Number(item.employerDoo),
      employerHealth: Number(item.employerHealth),
      employerOther: Number(item.employerOther),
    }));

    const totals = {
      totalInsuranceBase: employees.reduce((s, e) => s + e.insuranceBase, 0),
      totalEmployeeDoo: employees.reduce((s, e) => s + e.employeeDoo, 0),
      totalEmployeeHealth: employees.reduce((s, e) => s + e.employeeHealth, 0),
      totalEmployerDoo: employees.reduce((s, e) => s + e.employerDoo, 0),
      totalEmployerHealth: employees.reduce((s, e) => s + e.employerHealth, 0),
      totalEmployerOther: employees.reduce((s, e) => s + e.employerOther, 0),
      totalEmployeeInsurance: employees.reduce((s, e) => s + e.employeeDoo + e.employeeHealth, 0),
      totalEmployerInsurance: employees.reduce((s, e) => s + e.employerDoo + e.employerHealth + e.employerOther, 0),
    };

    const report = {
      periodStart,
      periodEnd,
      type: 'obra1',
      employees,
      totals,
      employeeCount: employees.length,
    };

    const result = await db.insert(taxDeclarations).values({
      tenantId,
      type: 'obra1',
      periodStart,
      periodEnd,
      totalAmount: totals.totalInsuranceBase.toString(),
      data: report,
      status: 'draft',
    }).returning();

    return result[0];
  }

  // Обр. 6 — Данъчна декларация за удържан данък общ доход (месечна)
  static async generateObra6Declaration(tenantId: string, year: number, month: number) {
    const monthStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const periodEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const [batch] = await db.select()
      .from(payrollBatches)
      .where(and(
        eq(payrollBatches.tenantId, tenantId),
        eq(payrollBatches.month, monthStr)
      ));

    if (!batch) throw new Error(`Няма изчислен ТРЗ за ${month}/${year}`);

    const items = await db.select()
      .from(payrollItems)
      .where(eq(payrollItems.batchId, batch.id));

    const employees = items.map(item => ({
      name: item.employeeName,
      gross: Number(item.gross),
      employeeInsurance: Number(item.employeeInsurance),
      taxableIncome: Number(item.gross) - Number(item.employeeInsurance),
      incomeTax: Number(item.incomeTax),
    }));

    const totals = {
      totalGross: employees.reduce((s, e) => s + e.gross, 0),
      totalEmployeeInsurance: employees.reduce((s, e) => s + e.employeeInsurance, 0),
      totalTaxableIncome: employees.reduce((s, e) => s + e.taxableIncome, 0),
      totalIncomeTax: employees.reduce((s, e) => s + e.incomeTax, 0),
    };

    const report = {
      periodStart,
      periodEnd,
      type: 'obra6',
      employees,
      totals,
      employeeCount: employees.length,
    };

    const result = await db.insert(taxDeclarations).values({
      tenantId,
      type: 'obra6',
      periodStart,
      periodEnd,
      totalAmount: totals.totalIncomeTax.toString(),
      data: report,
      status: 'draft',
    }).returning();

    return result[0];
  }

  // VIES — Декларация за вътреобщностна търговия (месечна)
  static async generateViesDeclaration(tenantId: string, year: number, month: number) {
    const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const periodEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const records = await db.select()
      .from(vatJournals)
      .where(and(
        eq(vatJournals.tenantId, tenantId),
        eq(vatJournals.periodYear, year),
        eq(vatJournals.periodMonth, month),
        eq(vatJournals.isIntraCommunity, true),
      ));

    const sales = records.filter(r => r.type === 'sales');
    const purchases = records.filter(r => r.type === 'purchases');

    const mapRecord = (r: typeof records[0]) => ({
      documentNumber: r.documentNumber || '',
      invoiceDate: r.invoiceDate || '',
      counterpartyName: r.counterpartyName || '',
      counterpartyVat: r.counterpartyVat || '',
      netAmount: Number(r.netAmount || 0),
      vatAmount: Number(r.vatAmount || 0),
      totalAmount: Number(r.totalAmount || 0),
    });

    const report = {
      periodStart,
      periodEnd,
      sales: sales.map(mapRecord),
      purchases: purchases.map(mapRecord),
      totals: {
        salesNet: sales.reduce((s, r) => s + Number(r.netAmount || 0), 0),
        purchasesNet: purchases.reduce((s, r) => s + Number(r.netAmount || 0), 0),
        salesCount: sales.length,
        purchasesCount: purchases.length,
      },
    };

    const result = await db.insert(taxDeclarations).values({
      tenantId,
      type: 'vies',
      periodStart,
      periodEnd,
      totalAmount: report.totals.salesNet.toString(),
      data: report,
      status: 'draft',
    }).returning();

    return result[0];
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

  // ==================== ВАЛИДАЦИЯ НА XML ====================
  static async validateDDSXml(xmlContent: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Парсваме с xml2js вместо с тежки native библиотеки (libxmljs2), за да не счупим билда в Render
      const { parseStringPromise } = await import('xml2js');
      const parsed = await parseStringPromise(xmlContent);
      const dds = parsed.Декларация;

      if (!dds) {
        return { valid: false, errors: ["Липсва коренният елемент <Декларация>"] };
      }

      if (!dds.Идентификация?.[0]?.ЕИК?.[0]) {
        errors.push("Липсва ЕИК на фирмата.");
      }

      const payableVAT = parseFloat(dds.Данни?.[0]?.Резултат?.[0]?.ДДСЗаПлащане?.[0] || '0');
      if (payableVAT < 0) {
        errors.push("Отрицателна стойност за ДДС за плащане.");
      }

      const salesVAT = parseFloat(dds.Данни?.[0]?.Продажби?.[0]?.Общо?.[0] || '0');
      if (isNaN(salesVAT)) {
        errors.push("Грешен формат на ДДС Продажби.");
      }

      return { valid: errors.length === 0, errors };
    } catch (err: any) {
      return { valid: false, errors: [`Грешка при парсване на XML: ${err.message}`] };
    }
  }
}
