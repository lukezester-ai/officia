import { db } from "@/lib/db/db";
import { invoices } from "@/lib/db/schema";
import { requireTenant } from "@/lib/auth/get-tenant";
import InvoicesClient from "./InvoicesClient";
import { desc, eq } from "drizzle-orm";

export default async function InvoicesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const { tenantId } = await requireTenant();
  const rows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.tenantId, tenantId))
    .orderBy(desc(invoices.createdAt))
    .limit(500);

  const serialized = rows.map((r) => ({
    id: r.id,
    invoiceNumber: String(r.invoiceNumber ?? ""),
    clientName: String(r.clientName || r.counterpartyName || ""),
    clientAddress: String(r.clientAddress || r.counterpartyAddress || ""),
    clientVatNumber: String(r.clientVatNumber || r.counterpartyEik || ""),
    issueDate: String(r.issueDate ?? ""),
    dueDate: String(r.dueDate ?? ""),
    status: String(r.status ?? "draft"),
    subtotal: String(r.subtotal || r.netAmount || "0"),
    vatAmount: String(r.vatAmount ?? "0"),
    total: String((Number(r.total || 0) ? r.total : r.totalAmount) || "0"),
    notes: String(r.notes ?? ""),
    items: Array.isArray(r.items) ? r.items : [],
    createdAt: r.createdAt ? r.createdAt.toISOString() : "",
  }));

  return <InvoicesClient lang={lang} invoices={serialized} />;
}
