import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { bankAccounts } from "./bank_accounts";
import { tenants } from "./tenants";

export const paymentOrders = pgTable("payment_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  accountId: uuid("account_id").references(() => bankAccounts.id).notNull(),
  kind: text("kind").notNull(),
  beneficiaryName: text("beneficiary_name").notNull(),
  beneficiaryIban: text("beneficiary_iban").notNull(),
  amount: text("amount").notNull(),
  currency: text("currency").default("EUR"),
  reason: text("reason").notNull(),
  budgetCode: text("budget_code"),
  liableId: text("liable_id"),
  documentNumber: text("document_number"),
  documentDate: text("document_date"),
  period: text("period"),
  status: text("status").default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
});
