// @ts-nocheck

/**
 * Изчислява действителната сума за плащане на фактура,
 * независимо дали е записана в totalAmount, total, amount,
 * или се сумира от редовете (lines).
 */
export function getInvoiceEffectiveAmount(invoice: any, lines?: any[]): number {
  if (!invoice) return 0;

  // 1. Ако имаме редове и сумата им е > 0, тя е най-точна (ако фактурата е в процес или има детайли)
  if (lines && Array.isArray(lines) && lines.length > 0) {
    const linesTotal = lines.reduce((acc, line) => {
      const lt = parseFloat(line.lineTotal);
      if (!isNaN(lt) && lt > 0) return acc + lt;
      const q = parseFloat(line.quantity) || 1;
      const p = parseFloat(line.unitPrice) || 0;
      const rate = parseFloat(line.vatRate) || 0;
      const net = q * p;
      const vat = net * (rate / 100);
      return acc + net + vat;
    }, 0);
    if (linesTotal > 0) return Math.round(linesTotal * 100) / 100;
  }

  // 2. Проверяваме totalAmount (ако е строго > 0)
  const ta = parseFloat(invoice.totalAmount);
  if (!isNaN(ta) && ta > 0) return Math.round(ta * 100) / 100;

  // 3. Проверяваме total (ако е строго > 0)
  const t = parseFloat(invoice.total);
  if (!isNaN(t) && t > 0) return Math.round(t * 100) / 100;

  // 4. Проверяваме amount (ако е строго > 0)
  const a = parseFloat(invoice.amount);
  if (!isNaN(a) && a > 0) return Math.round(a * 100) / 100;

  // 5. Проверяваме netAmount + vatAmount
  const na = parseFloat(invoice.netAmount) || 0;
  const va = parseFloat(invoice.vatAmount) || 0;
  if (na + va > 0) return Math.round((na + va) * 100) / 100;

  // 6. Fallback (ако всичко е 0 или невалидно)
  return 0;
}
