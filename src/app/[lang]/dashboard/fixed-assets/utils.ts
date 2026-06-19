// @ts-nocheck
export function calcDepreciationSchedule(asset: {
  acquisitionDate: string; acquisitionCost: number; salvageValue: number;
  usefulLifeMonths: number; amortizationMethod: string;
}) {
  const months = Math.round(asset.usefulLifeMonths);
  const depreciableAmount = asset.acquisitionCost - asset.salvageValue;
  const schedule: { month: number; year: number; depreciation: number; accumulated: number; bookValue: number }[] = [];
  const startDate = new Date(asset.acquisitionDate);
  let accumulated = 0;
  let bookValue = asset.acquisitionCost;

  for (let i = 0; i < months; i++) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i);
    let depreciation = 0;
    if (asset.amortizationMethod === 'declining_balance') {
      const rate = 2 / months;
      depreciation = Math.round(bookValue * rate * 100) / 100;
      if (i === months - 1) depreciation = Math.round((bookValue - asset.salvageValue) * 100) / 100;
    } else {
      depreciation = Math.round((depreciableAmount / months) * 100) / 100;
      if (i === months - 1) depreciation = Math.round((depreciableAmount - accumulated) * 100) / 100;
    }
    accumulated = Math.round((accumulated + depreciation) * 100) / 100;
    bookValue = Math.round((asset.acquisitionCost - accumulated) * 100) / 100;
    schedule.push({ month: d.getMonth() + 1, year: d.getFullYear(), depreciation, accumulated, bookValue: Math.max(bookValue, asset.salvageValue) });
  }
  return schedule;
}

export function calcCurrentBookValue(asset: {
  acquisitionDate: string; acquisitionCost: number; salvageValue: number;
  usefulLifeMonths: number; amortizationMethod: string;
}) {
  const schedule = calcDepreciationSchedule(asset);
  const now = new Date();
  const elapsed = (now.getFullYear() - new Date(asset.acquisitionDate).getFullYear()) * 12
    + (now.getMonth() - new Date(asset.acquisitionDate).getMonth());
  const idx = Math.min(elapsed, schedule.length - 1);
  if (idx < 0) return { bookValue: asset.acquisitionCost, accumulated: 0, monthlyDepreciation: schedule[0]?.depreciation || 0 };
  return { bookValue: schedule[idx].bookValue, accumulated: schedule[idx].accumulated, monthlyDepreciation: schedule[0]?.depreciation || 0 };
}