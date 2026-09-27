export type InvoiceDay = { year: number; month: number; day: number };

export type MoneyRow = {
  amount: number;
  issueDate: string | null;
  dueDate: string | null;
  status: string | null;
};

export type InvoiceSnapshot = {
  revenue: number;
  expenses: number;
  difference: number;
  salesThisMonth: number;
  salesLastMonth: number;
  purchasesThisMonth: number;
  purchasesLastMonth: number;
  salesChangePercent: number | null;
  purchasesChangePercent: number | null;
  thisMonthLabel: string;
  lastMonthLabel: string;
  overdueCount: number;
  overdueAmount: number;
  dueThisWeekCount: number;
  dueThisWeekAmount: number;
  lines: string[];
};

const MONTHS = [
  "януари",
  "февруари",
  "март",
  "април",
  "май",
  "юни",
  "юли",
  "август",
  "септември",
  "октомври",
  "ноември",
  "декември",
];

const SALES_COUNTED = new Set(["issued", "paid", "платена"]);
const PURCHASE_COUNTED = new Set(["approved", "paid"]);

export function parseInvoiceDay(value: string | null | undefined): InvoiceDay | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

export function sofiaToday(now = new Date()): InvoiceDay {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Sofia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: read("year"), month: read("month"), day: read("day") };
}

export function addDays(day: InvoiceDay, days: number): InvoiceDay {
  const shifted = new Date(Date.UTC(day.year, day.month - 1, day.day + days));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

function ordinal(day: InvoiceDay) {
  return Date.UTC(day.year, day.month - 1, day.day);
}

function sameMonth(day: InvoiceDay | null, year: number, month: number) {
  return day !== null && day.year === year && day.month === month;
}

export function percentChange(current: number, previous: number): number | null {
  if (!(previous > 0) || !Number.isFinite(current) || !Number.isFinite(previous)) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function splitIssuedByDue(
  rows: { status: string | null; dueDate: string | null; amount: number }[],
  today: InvoiceDay,
) {
  const weekEnd = addDays(today, 7);
  const todayOrdinal = ordinal(today);
  const weekOrdinal = ordinal(weekEnd);
  let overdueCount = 0;
  let overdueAmount = 0;
  let dueSoonCount = 0;
  let dueSoonAmount = 0;

  for (const row of rows) {
    if (row.status !== "issued" || !Number.isFinite(row.amount)) continue;
    const due = parseInvoiceDay(row.dueDate);
    if (!due) continue;
    const dueOrdinal = ordinal(due);
    if (dueOrdinal < todayOrdinal) {
      overdueCount += 1;
      overdueAmount += row.amount;
    } else if (dueOrdinal <= weekOrdinal) {
      dueSoonCount += 1;
      dueSoonAmount += row.amount;
    }
  }

  return { overdueCount, overdueAmount, dueSoonCount, dueSoonAmount };
}

export function sharePercent(part: number, total: number): number | null {
  if (!(total > 0) || !Number.isFinite(part)) return null;
  return Math.round((part / total) * 100);
}

function eur(amount: number) {
  return `${amount.toLocaleString("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function sumInMonth(rows: MoneyRow[], year: number, month: number) {
  return rows.reduce((sum, row) => {
    const day = parseInvoiceDay(row.issueDate);
    return sameMonth(day, year, month) ? sum + row.amount : sum;
  }, 0);
}

export function buildInvoiceSnapshot(input: {
  sales: MoneyRow[];
  purchases: MoneyRow[];
  today: InvoiceDay;
}): InvoiceSnapshot {
  const sales = input.sales.filter((row) => SALES_COUNTED.has(row.status || "") && Number.isFinite(row.amount));
  const purchases = input.purchases.filter((row) => PURCHASE_COUNTED.has(row.status || "") && Number.isFinite(row.amount));
  const last = input.today.month === 1
    ? { year: input.today.year - 1, month: 12 }
    : { year: input.today.year, month: input.today.month - 1 };
  const weekEnd = addDays(input.today, 7);
  const todayOrdinal = ordinal(input.today);
  const weekOrdinal = ordinal(weekEnd);

  const revenue = sales.reduce((sum, row) => sum + row.amount, 0);
  const expenses = purchases.reduce((sum, row) => sum + row.amount, 0);
  const salesThisMonth = sumInMonth(sales, input.today.year, input.today.month);
  const salesLastMonth = sumInMonth(sales, last.year, last.month);
  const purchasesThisMonth = sumInMonth(purchases, input.today.year, input.today.month);
  const purchasesLastMonth = sumInMonth(purchases, last.year, last.month);

  const overdue = sales.filter((row) => {
    if (row.status !== "issued") return false;
    const due = parseInvoiceDay(row.dueDate);
    return due !== null && ordinal(due) < todayOrdinal;
  });
  const dueThisWeek = purchases.filter((row) => {
    if (row.status !== "approved") return false;
    const due = parseInvoiceDay(row.dueDate);
    if (!due) return false;
    const dueOrdinal = ordinal(due);
    return dueOrdinal >= todayOrdinal && dueOrdinal <= weekOrdinal;
  });

  const overdueAmount = overdue.reduce((sum, row) => sum + row.amount, 0);
  const dueThisWeekAmount = dueThisWeek.reduce((sum, row) => sum + row.amount, 0);
  const lines = sales.length === 0 && purchases.length === 0
    ? ["Няма издадени продажби или одобрени покупки. Черновите не влизат в сумите."]
    : [`Продажби ${eur(revenue)}, покупки ${eur(expenses)}. Разликата ${eur(revenue - expenses)} е от фактури, не от счетоводен баланс.`];

  if (overdue.length > 0) lines.push(`${overdue.length} просрочени издадени фактури за ${eur(overdueAmount)}.`);
  if (dueThisWeek.length > 0) lines.push(`${dueThisWeek.length} одобрени покупки с падеж до 7 дни за ${eur(dueThisWeekAmount)}.`);

  return {
    revenue,
    expenses,
    difference: revenue - expenses,
    salesThisMonth,
    salesLastMonth,
    purchasesThisMonth,
    purchasesLastMonth,
    salesChangePercent: percentChange(salesThisMonth, salesLastMonth),
    purchasesChangePercent: percentChange(purchasesThisMonth, purchasesLastMonth),
    thisMonthLabel: MONTHS[input.today.month - 1] ?? "",
    lastMonthLabel: MONTHS[last.month - 1] ?? "",
    overdueCount: overdue.length,
    overdueAmount,
    dueThisWeekCount: dueThisWeek.length,
    dueThisWeekAmount,
    lines,
  };
}
