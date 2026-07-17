// @ts-nocheck
"use server";
import { db } from "@/lib/db/db";
import { invoices } from "@/lib/db/schema";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function createInvoice(lang: string, data: {
  invoiceNumber: string;
  clientName: string;
  clientAddress: string;
  clientVatNumber: string;
  issueDate: string;
  dueDate: string;
  status: string;
  notes: string;
  items: any[];
  subtotal: string;
  vatAmount: string;
  total: string;
}) {
  const finalData = {
    ...data,
    counterpartyName: "Агри Нексус ЕООД",
    counterpartyEik: "208692862",
    counterpartyVat: "BG208692862", // Usually BG + EIK if registered
  };

  const result = await (db as any)
    .insert(invoices)
    .values(finalData)
    .returning({ id: (invoices as any).id });

  const id = result[0]?.id;
  revalidatePath(`/${lang}/dashboard/accounting/invoices`);
  redirect(`/${lang}/dashboard/accounting/invoices/${id}`);
}

import { ensureAutoJournalForInvoice } from "@/lib/accounting/auto-journal";
import { syncStockFromSalesInvoice } from "@/lib/inventory/auto-stock";

export async function updateInvoiceStatus(id: any, status: string, lang: string) {
  await (db as any)
    .update(invoices)
    .set({ status, updatedAt: new Date() })
    .where(eq((invoices as any).id, id));

  if (["issued", "approved", "sent", "paid"].includes(status)) {
    const [inv] = await (db as any).select().from(invoices).where(eq((invoices as any).id, id));
    if (inv && inv.tenantId) {
      await ensureAutoJournalForInvoice(String(id), inv.tenantId);
      await syncStockFromSalesInvoice(String(id), inv.tenantId);
    }
  }

  revalidatePath(`/${lang}/dashboard/accounting/invoices`);
  revalidatePath(`/${lang}/dashboard/accounting/invoices/${id}`);
}

export async function deleteInvoice(id: number, lang: string) {
  await (db as any).delete(invoices).where(eq((invoices as any).id, id));
  revalidatePath(`/${lang}/dashboard/accounting/invoices`);
  redirect(`/${lang}/dashboard/accounting/invoices`);
}
