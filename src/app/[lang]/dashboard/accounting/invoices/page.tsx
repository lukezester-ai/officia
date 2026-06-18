import { db } from "@/lib/db/db";
import { invoices } from "@/lib/db/schema";
import InvoicesClient from "./InvoicesClient";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";

export default async function InvoicesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  let rows: any[] = [];
  try {
    rows = await (db as any)
      .select()
      .from(invoices)
      .orderBy(desc((invoices as any).createdAt))
      .limit(500);
  } catch {}

  const serialized = rows.map((r: any) => ({
    id: Number(r.id),
    invoiceNumber: String(r.invoiceNumber ?? r.invoice_number ?? ""),
    clientName: String(r.clientName ?? r.client_name ?? ""),
    clientAddress: String(r.clientAddress ?? r.client_address ?? ""),
    clientVatNumber: String(r.clientVatNumber ?? r.client_vat_number ?? ""),
    issueDate: String(r.issueDate ?? r.issue_date ?? ""),
    dueDate: String(r.dueDate ?? r.due_date ?? ""),
    status: String(r.status ?? "draft"),
    subtotal: String(r.subtotal ?? "0"),
    vatAmount: String(r.vatAmount ?? r.vat_amount ?? "0"),
    total: String(r.total ?? "0"),
    notes: String(r.notes ?? ""),
    items: Array.isArray(r.items) ? r.items : [],
    createdAt: String(r.createdAt ?? r.created_at ?? ""),
  }));

  return <InvoicesClient lang={lang} invoices={serialized} />;
}
