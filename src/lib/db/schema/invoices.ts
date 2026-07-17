// @ts-nocheck
import { pgTable, serial, text, numeric, timestamp, jsonb, uuid, boolean } from "drizzle-orm/pg-core";

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id"),
  userId: uuid("user_id"),
  invoiceNumber: text("invoice_number"),
  type: text("type"),
  clientName: text("client_name"),
  counterpartyName: text("counterparty_name"),
  clientAddress: text("client_address"),
  counterpartyAddress: text("counterparty_address"),
  clientVatNumber: text("client_vat_number"),
  counterpartyEik: text("counterparty_eik"),
  counterpartyVat: text("counterparty_vat"),
  issueDate: text("issue_date"),
  dueDate: text("due_date"),
  status: text("status").default("draft"),
  notes: text("notes"),
  items: jsonb("items").default([]),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).default("0"),
  netAmount: numeric("net_amount", { precision: 12, scale: 2 }).default("0"),
  vatAmount: numeric("vat_amount", { precision: 12, scale: 2 }).default("0"),
  amount: numeric("amount", { precision: 12, scale: 2 }).default("0"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).default("0"),
  vatPosted: boolean("vat_posted").default(false),
  aiStatus: text("ai_status"), // ok, needs_review, duplicate_suspected
  aiConfidence: numeric("ai_confidence", { precision: 3, scale: 2 }), // 0.00 - 1.00
  matchedTransactionId: uuid("matched_transaction_id"), // Reference to bank_transactions
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  paymentUrl: text("payment_url"),
  reviewStatus: text("review_status").default("pending"), // pending, reviewed, auto_approved
  einvoiceStatus: text("einvoice_status").default("pending"), // pending, approved, rejected, error
  errorReason: text("error_reason"), // Reason from NAP or validation if einvoiceStatus = error
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const invoiceLines = pgTable("invoice_lines", {
  id: serial("id").primaryKey(),
  invoiceId: serial("invoice_id").references(() => invoices.id),
  description: text("description"),
  quantity: numeric("quantity"),
  unitPrice: numeric("unit_price"),
  vatRate: numeric("vat_rate"),
  lineNet: numeric("line_net"),
  lineVat: numeric("line_vat"),
  lineTotal: numeric("line_total"),
});
