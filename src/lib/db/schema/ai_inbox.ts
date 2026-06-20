import { pgTable, text, timestamp, uuid, numeric, jsonb } from "drizzle-orm/pg-core";

export const aiInboxItems = pgTable("ai_inbox_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  type: text("type").notNull(), // invoice_duplicate, unmatched_transaction, missing_vat_data, expiring_document...
  sourceType: text("source_type").notNull(), // invoice, transaction, document, vat_entry, employee...
  sourceId: text("source_id").notNull(), // Can be UUID or numeric string
  title: text("title").notNull(),
  description: text("description"),
  confidence: numeric("confidence", { precision: 3, scale: 2 }), // 0.00 to 1.00
  status: text("status").default("open"), // open, accepted, rejected, snoozed, resolved
  priority: text("priority").default("normal"), // low, normal, high, critical
  assignedTo: uuid("assigned_to"), // user_id
  metaJson: jsonb("meta_json"), // Extra data needed for resolution
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
