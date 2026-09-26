import { requireTenant } from "@/lib/auth/get-tenant";
import { listAccountMovements } from "@/lib/accounting/journal-read";
import BudgetsClient from "./BudgetsClient";

export default async function BudgetsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  const { tenantId } = await requireTenant();
  const journalEntries = await listAccountMovements(tenantId, 2000);

  return <BudgetsClient lang={lang} journalEntries={journalEntries} />;
}
