// @ts-nocheck
import { db } from '@/lib/db/db';
import { payrollRuns, payrollSlipItems } from '@/lib/db/schema/payroll_runs';
import { employees } from '@/lib/db/schema/employees';
import { eq, and } from 'drizzle-orm';

export interface PayrollBatchItem {
  employeeId: string;
  fullName: string;
  iban: string;
  netAmount: number;
  currency: string;
  reason: string;
}

/**
 * ТИКЕТ 7: ТРЗ → Banking batch (Direct Pull).
 * Batch export функцията чете директно от `payroll_runs` и `payroll_slip_items` (нетни суми + IBAN от employee records),
 * вместо да разчита на ръчно въвеждане.
 * Премапва съществуващите данни към банковия XML (ISO 20022 / SEPA pain.001) или БИСЕРА CSV формат.
 */
export async function generatePayrollBankBatchExport(runId: string, format: 'xml' | 'csv' = 'xml'): Promise<{
  success: boolean;
  content?: string;
  filename?: string;
  totalAmount?: number;
  itemsCount?: number;
  error?: string;
}> {
  try {
    const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, runId));
    if (!run) {
      return { success: false, error: 'Ведомостта не е намерена' };
    }

    const items = await db.select({
      slipId: payrollSlipItems.id,
      netSalary: payrollSlipItems.netSalary,
      firstName: employees.firstName,
      lastName: employees.lastName,
      iban: employees.iban,
    }).from(payrollSlipItems)
      .innerJoin(employees, eq(payrollSlipItems.employeeId, employees.id))
      .where(eq(payrollSlipItems.runId, runId));

    if (!items || items.length === 0) {
      return { success: false, error: 'Няма записи във ведомостта за експорт' };
    }

    const batchItems: PayrollBatchItem[] = items.filter(i => parseFloat(i.netSalary || '0') > 0 && i.iban).map(i => ({
      employeeId: i.slipId,
      fullName: `${i.firstName} ${i.lastName}`.trim(),
      iban: (i.iban || '').replace(/\s+/g, '').toUpperCase(),
      netAmount: parseFloat(i.netSalary || '0'),
      currency: 'BGN',
      reason: `Заплата м. ${run.month}/${run.year}`,
    }));

    if (batchItems.length === 0) {
      return { success: false, error: 'Няма служители с въведен валиден IBAN и положителна нетна сума.' };
    }

    const totalAmount = batchItems.reduce((sum, item) => sum + item.netAmount, 0);
    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'csv') {
      // БИСЕРА / Банков CSV формат за масово плащане на заплати
      let csv = 'IBAN на получател;Име на получател;Сума;Валута;Основание\n';
      for (const item of batchItems) {
        csv += `${item.iban};"${item.fullName}";${item.netAmount.toFixed(2)};${item.currency};"${item.reason}"\n`;
      }
      return {
        success: true,
        content: csv,
        filename: `payroll_batch_${run.month}_${run.year}.csv`,
        totalAmount,
        itemsCount: batchItems.length,
      };
    } else {
      // ISO 20022 / SEPA pain.001.001.03 XML за директен банков импорт
      const msgId = `OFFICIA-PAY-${Date.now()}`;
      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${new Date().toISOString()}</CreDtTm>
      <NbOfTxs>${batchItems.length}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      <InitgPty>
        <Nm>Officia Tenant System</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>PAYROLL-${run.month}-${run.year}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${batchItems.length}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      <ReqdExctnDt>${dateStr}</ReqdExctnDt>
      <Dbtr>
        <Nm>Company Employer</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id><IBAN>BG00BNBG91550000000000</IBAN></Id>
      </DbtrAcct>
`;

      for (const item of batchItems) {
        xml += `      <CdtTrfTxInf>
        <PmtId><EndToEndId>${item.employeeId.slice(0, 30)}</EndToEndId></PmtId>
        <Amt><InstdAmt Ccy="${item.currency}">${item.netAmount.toFixed(2)}</InstdAmt></Amt>
        <Cdtr><Nm>${item.fullName}</Nm></Cdtr>
        <CdtrAcct><Id><IBAN>${item.iban}</IBAN></Id></CdtrAcct>
        <RmtInf><Ustrd>${item.reason}</Ustrd></RmtInf>
      </CdtTrfTxInf>
`;
      }

      xml += `    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;

      return {
        success: true,
        content: xml,
        filename: `payroll_batch_${run.month}_${run.year}.xml`,
        totalAmount,
        itemsCount: batchItems.length,
      };
    }
  } catch (error: any) {
    console.error('[generatePayrollBankBatchExport] Error:', error);
    return { success: false, error: error.message };
  }
}
