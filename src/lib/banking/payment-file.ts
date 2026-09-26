import { isValidIban, normalizeIban } from "./iban";

export type PaymentKind = "transfer" | "budget";

export interface PaymentLine {
  beneficiaryName: string;
  beneficiaryIban: string;
  amount: number;
  currency: string;
  reason: string;
  kind: PaymentKind;
  budgetCode?: string;
  liableId?: string;
  documentNumber?: string;
  documentDate?: string;
  period?: string;
}

function clean(value: string | undefined) {
  return (value ?? "").trim();
}

export function validatePaymentLine(line: PaymentLine): string | null {
  const name = clean(line.beneficiaryName);
  const iban = normalizeIban(line.beneficiaryIban);
  const reason = clean(line.reason);
  const currency = clean(line.currency).toUpperCase() || "EUR";
  const cents = Math.round((line.amount + Number.EPSILON) * 100);

  if (name.length < 2 || name.length > 70) return "Името на получателя трябва да е между 2 и 70 знака.";
  if (!isValidIban(iban)) return "IBAN на получателя е невалиден.";
  if (!Number.isFinite(line.amount) || line.amount <= 0) return "Сумата трябва да е положителна.";
  if (Math.abs(line.amount - cents / 100) > 0.001) return "Сумата е до два знака след десетичната точка.";
  if (currency !== "EUR" && currency !== "BGN") return "Валутата е EUR или BGN.";
  if (reason.length < 2 || reason.length > 140) return "Основанието трябва да е между 2 и 140 знака.";

  if (line.kind === "budget") {
    if (!/^\d{6}$/.test(clean(line.budgetCode))) return "Кодът за вид плащане е 6 цифри.";
    if (!/^\d{9,13}$/.test(clean(line.liableId))) return "ЕГН или ЕИК на задълженото лице е задължителен.";
    const documentDate = clean(line.documentDate);
    if (documentDate && !/^\d{4}-\d{2}-\d{2}$/.test(documentDate)) return "Датата на документа е във формат ГГГГ-ММ-ДД.";
    const period = clean(line.period);
    if (period && !/^\d{6}$/.test(period)) return "Периодът е във формат ГГГГММ.";
  }

  return null;
}

function cell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export function buildPaymentCsv(debtorIban: string, lines: PaymentLine[]): string {
  const from = normalizeIban(debtorIban);
  const header = [
    "От IBAN",
    "Към IBAN",
    "Получател",
    "Сума",
    "Валута",
    "Основание",
    "Вид",
    "Код за вид плащане",
    "ЕГН/ЕИК",
    "Номер на документ",
    "Дата на документ",
    "Период",
  ].join(";");

  const rows = lines.map((line) => {
    const kind = line.kind === "budget" ? "бюджетно" : "превод";
    return [
      cell(from),
      cell(normalizeIban(line.beneficiaryIban)),
      cell(clean(line.beneficiaryName)),
      line.amount.toFixed(2),
      cell(clean(line.currency).toUpperCase() || "EUR"),
      cell(clean(line.reason)),
      cell(kind),
      cell(line.kind === "budget" ? clean(line.budgetCode) : ""),
      cell(line.kind === "budget" ? clean(line.liableId) : ""),
      cell(clean(line.documentNumber)),
      cell(clean(line.documentDate)),
      cell(clean(line.period)),
    ].join(";");
  });

  return `\uFEFF${header}\n${rows.join("\n")}\n`;
}
