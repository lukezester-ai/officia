import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const workspaceRoleEnum = pgEnum("workspace_role", ["owner", "admin", "member"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "sent", "paid", "overdue", "void"]);
export const documentStatusEnum = pgEnum("document_status", ["uploaded", "processing", "ready", "failed"]);
export const employeeStatusEnum = pgEnum("employee_status", ["active", "on_leave", "inactive"]);
export const entryTypeEnum = pgEnum("entry_type", ["check_in", "check_out", "break_start", "break_end"]);
export const dayOfWeekEnum = pgEnum("day_of_week", ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["trialing", "active", "past_due", "canceled", "incomplete"]);

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  ownerClerkUserId: text("owner_clerk_user_id").notNull(),
  country: text("country").notNull().default("BG"),
  currency: text("currency").notNull().default("EUR"),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  slugIdx: uniqueIndex("workspaces_slug_idx").on(table.slug),
  ownerIdx: index("workspaces_owner_clerk_user_id_idx").on(table.ownerClerkUserId),
}));

export const workspaceMembers = pgTable("workspace_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  clerkUserId: text("clerk_user_id").notNull(),
  email: text("email").notNull(),
  role: workspaceRoleEnum("role").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  memberIdx: uniqueIndex("workspace_members_workspace_user_idx").on(table.workspaceId, table.clerkUserId),
  emailIdx: index("workspace_members_email_idx").on(table.email),
}));

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  status: invoiceStatusEnum("status").notNull().default("draft"),
  currency: text("currency").notNull().default("EUR"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  tax: numeric("tax", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  workspaceIdx: index("invoices_workspace_id_idx").on(table.workspaceId),
  invoiceNumberIdx: uniqueIndex("invoices_workspace_invoice_number_idx").on(table.workspaceId, table.invoiceNumber),
  statusIdx: index("invoices_status_idx").on(table.status),
}));

export const invoiceLineItems = pgTable("invoice_line_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull().default("1"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("20"),
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull().default("0"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  invoiceIdx: index("invoice_line_items_invoice_id_idx").on(table.invoiceId),
}));

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  fileType: text("file_type"),
  storagePath: text("storage_path"),
  status: documentStatusEnum("status").notNull().default("uploaded"),
  aiSummary: text("ai_summary"),
  extractedTextPreview: text("extracted_text_preview"),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  workspaceIdx: index("documents_workspace_id_idx").on(table.workspaceId),
  statusIdx: index("documents_status_idx").on(table.status),
  createdAtIdx: index("documents_created_at_idx").on(table.createdAt),
}));

export const employees = pgTable("employees", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  email: text("email"),
  roleTitle: text("role_title"),
  status: employeeStatusEnum("status").notNull().default("active"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  vacationDaysTotal: integer("vacation_days_total").notNull().default(20),
  vacationDaysUsed: integer("vacation_days_used").notNull().default(0),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  workspaceIdx: index("employees_workspace_id_idx").on(table.workspaceId),
  statusIdx: index("employees_status_idx").on(table.status),
}));

export const timeEntries = pgTable("time_entries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  type: entryTypeEnum("type").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  note: text("note"),
  location: text("location"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  employeeIdx: index("time_entries_employee_id_idx").on(table.employeeId),
  recordedAtIdx: index("time_entries_recorded_at_idx").on(table.recordedAt),
}));

export const workSchedules = pgTable("work_schedules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  dayOfWeek: dayOfWeekEnum("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  employeeIdx: index("work_schedules_employee_id_idx").on(table.employeeId),
  activeIdx: index("work_schedules_employee_active_idx").on(table.employeeId, table.isActive),
}));

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
  plan: text("plan").notNull().default("starter"),
  status: subscriptionStatusEnum("status").notNull().default("trialing"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  currentPeriodEndsAt: timestamp("current_period_ends_at", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  workspaceIdx: uniqueIndex("subscriptions_workspace_id_idx").on(table.workspaceId),
  customerIdx: index("subscriptions_stripe_customer_id_idx").on(table.stripeCustomerId),
  subscriptionIdx: uniqueIndex("subscriptions_stripe_subscription_id_idx").on(table.stripeSubscriptionId),
}));

export const workspacesRelations = relations(workspaces, ({ many, one }) => ({
  members: many(workspaceMembers),
  invoices: many(invoices),
  documents: many(documents),
  employees: many(employees),
  subscription: one(subscriptions),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ many, one }) => ({
  workspace: one(workspaces, {
    fields: [invoices.workspaceId],
    references: [workspaces.id],
  }),
  lineItems: many(invoiceLineItems),
}));

export const invoiceLineItemsRelations = relations(invoiceLineItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceLineItems.invoiceId],
    references: [invoices.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [documents.workspaceId],
    references: [workspaces.id],
  }),
}));

export const employeesRelations = relations(employees, ({ many, one }) => ({
  workspace: one(workspaces, {
    fields: [employees.workspaceId],
    references: [workspaces.id],
  }),
  timeEntries: many(timeEntries),
  workSchedules: many(workSchedules),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  employee: one(employees, {
    fields: [timeEntries.employeeId],
    references: [employees.id],
  }),
}));

export const workSchedulesRelations = relations(workSchedules, ({ one }) => ({
  employee: one(employees, {
    fields: [workSchedules.employeeId],
    references: [employees.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [subscriptions.workspaceId],
    references: [workspaces.id],
  }),
}));




