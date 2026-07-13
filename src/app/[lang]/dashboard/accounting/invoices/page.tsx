// @ts-nocheck
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

  let rows: any[] = [];
  try {
    const { tenantId } = await requireTenant();
    rows = await db
      .select()
      .from(invoices)
      .where(eq((invoices as any).tenantId, tenantId))
      .orderBy(desc((invoices as any).createdAt))
      .limit(500);
  } catch {}

  const serialized = rows.map((r: any) => ({
    id: r.id,
    invoiceNumber: String(r.invoiceNumber ?? r.invoice_number ?? ""),
    clientName: String(r.clientName ?? r.client_name ?? ""),
    clientAddress: String(r.clientAddress ?? r.client_address ?? ""),
    clientVatNumber: String(r.clientVatNumber ?? r.client_vat_number ?? ""),
    issueDate: String(r.issueDate ?? r.issue_date ?? ""),
    dueDate: String(r.dueDate ?? r.due_date ?? ""),
    status: String(r.status ?? "draft"),
    subtotal: String(r.subtotal ?? "0"),
    vatAmount: String(r.vatAmount ?? r.vat_amount ?? "0"),
    total: String(r.total ?? r.totalAmount ?? r.total_amount ?? "0"),
    notes: String(r.notes ?? ""),
    items: Array.isArray(r.items) ? r.items : [],
    createdAt: String(r.createdAt ?? r.created_at ?? ""),
  }));

  return <InvoicesClient lang={lang} invoices={serialized} />;
}
