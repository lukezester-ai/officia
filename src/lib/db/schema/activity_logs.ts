import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  userId: uuid("user_id"), // The user who performed the action, can be null if AI
  entityType: text("entity_type").notNull(), // invoice, transaction, counterparty
  entityId: uuid("entity_id").notNull(), // ID of the entity
  action: text("action").notNull(), // e.g. "invoice_linked", "match_accepted", "review_item_resolved"
  metaJson: jsonb("meta_json"), // Store what changed
  createdAt: timestamp("created_at").defaultNow(),
});
