"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { invoiceLineItems, invoices } from "@/lib/db/schema";
import { bootstrapWorkspace } from "@/lib/workspaces/bootstrap";

type DraftLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  subtotal: number;
  tax: number;
  total: number;
};

function localizedInvoicePath(locale: string, status: string) {
  return `/${locale}/dashboard/invoices?created=${status}`;
}

function parsePositiveNumber(value: FormDataEntryValue | null, fallback = 0) {
  const amount = Number(String(value || "").replace(",", "."));
  return Number.isFinite(amount) && amount >= 0 ? amount : fallback;
}

function money(value: number) {
  return (Math.round(value * 100) / 100).toFixed(2);
}

function parseLineItems(formData: FormData): DraftLineItem[] {
  const descriptions = formData.getAll("itemDescription");
  const quantities = formData.getAll("itemQuantity");
  const unitPrices = formData.getAll("itemUnitPrice");
  const taxRates = formData.getAll("itemTaxRate");

  return descriptions
    .map((descriptionEntry, index) => {
      const description = String(descriptionEntry || "").trim();
      const quantity = parsePositiveNumber(quantities[index] ?? null, 1);
      const unitPrice = parsePositiveNumber(unitPrices[index] ?? null);
      const taxRate = parsePositiveNumber(taxRates[index] ?? null, 20);
      const subtotal = quantity * unitPrice;
      const tax = subtotal * (taxRate / 100);

      return {
        description,
        quantity,
        unitPrice,
        taxRate,
        subtotal,
        tax,
        total: subtotal + tax,
      };
    })
    .filter((item) => item.description && item.quantity > 0 && item.unitPrice > 0);
}

export async function createInvoiceAction(formData: FormData) {
  const locale = await getLocale();
  const workspace = await bootstrapWorkspace();

  if (!db || workspace.status !== "ready" || !workspace.workspaceId) {
    redirect(localizedInvoicePath(locale, "database-not-ready"));
  }

  const workspaceId = workspace.workspaceId;
  const invoiceNumber = String(formData.get("invoiceNumber") || "").trim();
  const clientName = String(formData.get("clientName") || "").trim();
  const clientEmail = String(formData.get("clientEmail") || "").trim() || null;
  const currency = String(formData.get("currency") || "EUR").trim().toUpperCase();
  const dueDateValue = String(formData.get("dueDate") || "").trim();
  const items = parseLineItems(formData);

  if (!invoiceNumber || !clientName || items.length === 0) {
    redirect(localizedInvoicePath(locale, "missing-fields"));
  }

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = items.reduce((sum, item) => sum + item.tax, 0);
  const total = subtotal + tax;

  try {
    await db.transaction(async (tx) => {
      const [invoice] = await tx
        .insert(invoices)
        .values({
          workspaceId,
          invoiceNumber,
          clientName,
          clientEmail,
          currency,
          subtotal: money(subtotal),
          tax: money(tax),
          total: money(total),
          status: "draft",
          dueDate: dueDateValue ? new Date(dueDateValue + "T00:00:00.000Z") : null,
        })
        .returning({ id: invoices.id });

      if (!invoice) {
        throw new Error("Invoice insert did not return an id.");
      }

      await tx.insert(invoiceLineItems).values(
        items.map((item, index) => ({
          invoiceId: invoice.id,
          description: item.description,
          quantity: money(item.quantity),
          unitPrice: money(item.unitPrice),
          taxRate: money(item.taxRate),
          lineTotal: money(item.total),
          sortOrder: index,
        })),
      );
    });

    revalidatePath(`/${locale}/dashboard/invoices`);
    redirect(localizedInvoicePath(locale, "success"));
  } catch (error) {
    console.error("Failed to create invoice:", error);
    redirect(localizedInvoicePath(locale, "error"));
  }
}
