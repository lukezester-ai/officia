// src/ai/workflows.ts

/**
 * AI workflow utilities for Officia ERP.
 * Includes OCR journal entry generation, cash‑flow forecasting and
 * automatic approval logic. All functions use the existing Drizzle ORM
 * schema and rely on the project's AI client (e.g., OpenAI/Claude).
 */
import { db } from "../lib/db";
import { aiInboxItems } from "../lib/db/schema/ai_inbox";
import { journalEntries } from "../lib/db/schema/journal_entries";
import { invoices } from "../lib/db/schema/invoices";
import { eq, desc } from "drizzle-orm";
import type { InferModel } from "drizzle-orm";

type AiInbox = InferModel<typeof aiInboxItems, "select">;
type JournalEntry = InferModel<typeof journalEntries, "insert">;
type Invoice = InferModel<typeof invoices, "select">;

/**
 * Generate a journal entry from OCR‑extracted data.
 * @param ocrData - Raw OCR result containing line items.
 * @returns The created journal entry record.
 */
export async function generateJournalEntryFromOCR(ocrData: string): Promise<JournalEntry> {
  const parsed = JSON.parse(ocrData);
  const entry: JournalEntry = {
    tenantId: parsed.tenantId ?? "00000000-0000-0000-0000-000000000000",
    journalNumber: `JRN-${Date.now()}`,
    entryDate: new Date(parsed.entryDate ?? Date.now()),
    description: parsed.description ?? "OCR-generated entry",
  };
  const [created] = await db.insert(journalEntries).values(entry).returning();
  await db.insert(aiInboxItems).values({
    tenantId: entry.tenantId,
    type: "journal_entry",
    sourceType: "journal",
    sourceId: String(created.id),
    title: created.journalNumber,
    metaJson: JSON.stringify(entry),
  });
  return created;
}

/**
 * Forecast cash‑flow for the next `periods` months using historical data.
 * This is a thin wrapper around a statistical model – in production you would
 * call a dedicated service (Prophet, TensorFlow, etc.).
 */
export async function forecastCashFlow(periods: number = 12): Promise<number[]> {
  // Simple moving‑average placeholder – replace with ML model later
  const recent = await db
    .select()
    .from(invoices)
    .orderBy(desc(invoices.issueDate))
    .limit(12);
  const amounts = recent.map((inv) => Number(inv.amount));
  const avg = amounts.reduce((a, b) => a + b, 0) / (amounts.length || 1);
  return Array.from({ length: periods }, () => avg);
}

/**
 * Automatically approve a pending invoice if it meets policy thresholds.
 * Returns true when the invoice was approved.
 */
export async function autoApprove(invoiceId: string): Promise<boolean> {
  const inv = await db.select().from(invoices).where(eq(invoices.id, Number(invoiceId))).limit(1);
  if (!inv.length) return false;
  const invoice = inv[0];
  const vendorName = invoice.clientName ?? invoice.counterpartyName ?? "";
  const trustedVendors = ["Vendor A", "Vendor B"];
  if (Number(invoice.amount) < 5000 && trustedVendors.includes(vendorName)) {
    await db.update(invoices).set({ status: "approved" }).where(eq(invoices.id, Number(invoiceId)));
    await db.insert(aiInboxItems).values({
      tenantId: invoice.tenantId ?? "00000000-0000-0000-0000-000000000000",
      type: "approval",
      sourceType: "invoice",
      sourceId: String(invoice.id),
      title: `Approval for invoice ${invoice.invoiceNumber}`,
      metaJson: JSON.stringify({ invoiceId, approved: true }),
    });
    return true;
  }
  return false;
}
