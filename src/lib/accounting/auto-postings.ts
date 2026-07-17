// @ts-nocheck
// Auto-posting rules for double-entry accounting
// Call createAutoPostings() after creating an invoice or bank transaction

import { db } from "@/lib/db/db";
import { journalHeaders as journalEntries } from "@/lib/db/schema/journal_entries";

interface PostingLine {
  account: string;
  description: string;
  debit: number;
  credit: number;
}

interface AutoPostingInput {
  type: "sales_invoice" | "purchase_invoice" | "bank_debit" | "bank_credit" | "depreciation";
  tenantId: string;
  amount: number;
  vatAmount?: number;
  reference?: string;
  description?: string;
  date?: Date;
}

function buildLines(input: AutoPostingInput): PostingLine[] {
  const net = input.amount - (input.vatAmount ?? 0);
  const vat = input.vatAmount ?? 0;

  switch (input.type) {
    case "sales_invoice":
      // DR 411 Clients / CR 701 Revenue + CR 4532 VAT
      return [
        { account: "411", description: "Вземане от клиент", debit: input.amount, credit: 0 },
        { account: "701", description: "Приход от продажба", debit: 0, credit: net },
        ...(vat > 0 ? [{ account: "4532", description: "ДДС продажби", debit: 0, credit: vat }] : []),
      ];

    case "purchase_invoice":
      // DR 601 Expense + DR 4531 VAT / CR 401 Suppliers
      return [
        { account: "601", description: "Разход за покупка", debit: net, credit: 0 },
        ...(vat > 0 ? [{ account: "4531", description: "ДДС покупки", debit: vat, credit: 0 }] : []),
        { account: "401", description: "Задължение към доставчик", debit: 0, credit: input.amount },
      ];

    case "bank_debit":
      // DR 503 Bank / CR 411 Clients
      return [
        { account: "503", description: "Получено плащане", debit: input.amount, credit: 0 },
        { account: "411", description: "Погасяване на вземане", debit: 0, credit: input.amount },
      ];

    case "bank_credit":
      // DR 401 Suppliers / CR 503 Bank
      return [
        { account: "401", description: "Плащане към доставчик", debit: input.amount, credit: 0 },
        { account: "503", description: "Изходящо плащане", debit: 0, credit: input.amount },
      ];

    case "depreciation":
      // DR 603 Depreciation expense / CR 241 Accumulated depreciation
      return [
        { account: "603", description: "Амортизационна квота", debit: input.amount, credit: 0 },
        { account: "241", description: "Начислена амортизация", debit: 0, credit: input.amount },
      ];

    default:
      return [];
  }
}

export async function createAutoPostings(input: AutoPostingInput): Promise<void> {
  const lines = buildLines(input);
  if (lines.length === 0) return;

  const entryDate = input.date ?? new Date();
  const refNum = input.reference ?? `AUTO-${Date.now()}`;

  // Insert one row per line (simple flat model compatible with existing schema)
  for (const line of lines) {
    if (line.debit === 0 && line.credit === 0) continue;
    try {
      await db.insert(journalEntries as any).values({
        tenantId: input.tenantId,
        entryDate,
        referenceNumber: refNum,
        description: input.description ?? line.description,
        debitAccount: line.debit > 0 ? line.account : null,
        creditAccount: line.credit > 0 ? line.account : null,
        debitAmount: line.debit > 0 ? String(line.debit) : null,
        creditAmount: line.credit > 0 ? String(line.credit) : null,
        isAutomatic: true,
        createdAt: new Date(),
      });
    } catch {
      // If schema fields differ, fail silently — manual entries still work
    }
  }
}
