import { db } from "@/lib/db/db";
import { journalHeaders } from "@/lib/db/schema";
import BudgetsClient from "./BudgetsClient";

export default async function BudgetsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  let entries: any[] = [];
  try {
    entries = await db.select().from(journalHeaders as any).limit(2000);
  } catch {}

  const serialized = entries.map((e) => ({
    id: String(e.id ?? ""),
    date: String(e.entryDate ?? e.entry_date ?? ""),
    debitAccount: String(e.debitAccount ?? e.debit_account ?? ""),
    creditAccount: String(e.creditAccount ?? e.credit_account ?? ""),
    debitAmount: Number(e.debitAmount ?? e.debit_amount ?? 0),
    creditAmount: Number(e.creditAmount ?? e.credit_amount ?? 0),
  }));

  return <BudgetsClient lang={lang} journalEntries={serialized} />;
}
