import { pgTable, text, timestamp, uuid, numeric, jsonb } from "drizzle-orm/pg-core";
import { documents } from "./documents";

export const documentExtractions = pgTable("document_extractions", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").references(() => documents.id).notNull(),
  docType: text("doc_type"), // invoice, receipt, contract
  vendorName: text("vendor_name"),
  vendorVat: text("vendor_vat"),
  invoiceNumber: text("invoice_number"),
  issueDate: text("issue_date"),
  dueDate: text("due_date"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }),
  vatAmount: numeric("vat_amount", { precision: 12, scale: 2 }),
  currency: text("currency").default("EUR"),
  summary: text("summary"),
  rawJson: jsonb("raw_json"), // The full extraction output
  confidence: numeric("confidence", { precision: 3, scale: 2 }), // 0.00 to 1.00
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

