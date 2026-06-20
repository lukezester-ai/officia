import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const approvals = pgTable("approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  entityType: text("entity_type").notNull(), // invoice, manual_entry, payment
  entityId: uuid("entity_id").notNull(),
  requestedBy: uuid("requested_by"), // user_id
  assignedTo: uuid("assigned_to"), // user_id
  status: text("status").default("pending"), // pending, approved, rejected
  note: text("note"), // Optional note from approver/requester
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
