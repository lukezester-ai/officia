/** Сумата на сделката е крайна цена с 20% ДДС. */
export function splitDealAmount(amount: string): { net: string; vat: string; total: string } | null {
  const gross = Number(amount);
  if (!Number.isFinite(gross) || gross < 0) return null;
  const net = Math.round((gross / 1.2) * 100) / 100;
  const vat = Math.round((gross - net) * 100) / 100;
  const total = Math.round((net + vat) * 100) / 100;
  return {
    net: net.toFixed(2),
    vat: vat.toFixed(2),
    total: total.toFixed(2),
  };
}
