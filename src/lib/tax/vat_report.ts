import {
  fetchVatPeriodDocuments,
  vatPeriodBounds,
} from '@/lib/tax/vat-period';

export async function generateVATReport(tenantId: string, month: number, year: number) {
  if (!tenantId) {
    throw new Error('Липсва tenant за ДДС справката.');
  }
  if (month < 1 || month > 12) {
    throw new Error('Невалиден месец за ДДС справка.');
  }

  const { start, end } = vatPeriodBounds(year, month);
  const { sales, purchases, salesTotals, purchaseTotals } =
    await fetchVatPeriodDocuments(tenantId, start, end);

  const vatPayable = salesTotals.vat - purchaseTotals.vat;
  const viesData = [
    ...sales.map((row) => ({
      documentNumber: row.invoiceNumber,
      vatNumber: row.counterpartyVat,
    })),
    ...purchases.map((row) => ({
      documentNumber: row.invoiceNumber,
      vatNumber: row.supplierVat,
    })),
  ].filter((row) => typeof row.vatNumber === 'string' && /^[A-Z]{2}/i.test(row.vatNumber) && !row.vatNumber.toUpperCase().startsWith('BG'));

  return {
    period: { month, year, start, end },
    tenantId,
    salesCount: sales.length,
    purchasesCount: purchases.length,
    salesVat: round2(salesTotals.vat),
    purchasesVat: round2(purchaseTotals.vat),
    salesNet: round2(salesTotals.net),
    purchasesNet: round2(purchaseTotals.net),
    vatPayable: round2(vatPayable),
    viesData,
    xmlReadyData: {
      box11: round2(salesTotals.net),
      box20: round2(salesTotals.vat),
      box30: round2(purchaseTotals.vat),
      box50: round2(vatPayable),
    },
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
