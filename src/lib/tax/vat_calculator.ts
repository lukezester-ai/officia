// Данъчен модул - Изчисляване на ДДС (ЗДДС)
// Логика за генериране на Декларация по чл. 125

export async function calculateVatReturn(tenantId: string, year: number, month: number) {
  console.log(`Изчисляване на ДДС Декларация за период ${month}/${year}...`);
  
  // В реална среда: SQL заявка, която агрегира стойностите от vat_journals
  
  // Mock изчисления:
  const suppliesWithVat = 10000;  // Данъчна основа на продажбите
  const purchasesWithVat = 4000;  // Данъчна основа на покупките с право на кредит
  
  const vatOnSales = suppliesWithVat * 0.20;     // Начислен ДДС (2000)
  const vatOnPurchases = purchasesWithVat * 0.20; // ДДС за приспадане (800)
  
  // Клетка 31: ДДС за внасяне
  const vatPayable = Math.max(0, vatOnSales - vatOnPurchases); 
  
  // Клетка 32: ДДС за възстановяване
  const vatRefundable = Math.max(0, vatOnPurchases - vatOnSales); 
  
  return {
    period: { month, year },
    tenantId,
    suppliesWithVat,
    purchasesWithVat,
    vatOnSales,
    vatOnPurchases,
    vatPayable,    // Резултат за НАП: За внасяне
    vatRefundable  // Резултат за НАП: За възстановяване
  };
}
