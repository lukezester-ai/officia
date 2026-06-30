import { pgTable, uuid, varchar, timestamp, text, primaryKey, integer } from 'drizzle-orm/pg-core';
import { users } from './users';
import { tenants } from './tenants';

export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    tenantId: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    role: varchar('role', { length: 50 }).notNull().default('owner'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.tenantId] }),
  }),
);

export const tenantInvites = pgTable('tenant_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  email: text('email').notNull(),
  role: varchar('role', { length: 50 }).notNull().default('junior_accountant'),
  token: text('token').notNull().unique(),
  invitedBy: uuid('invited_by').references(() => users.id),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const napSubmissions = pgTable('nap_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'cascade' })
    .notNull(),
  periodYear: integer('period_year').notNull(),
  periodMonth: integer('period_month').notNull(),
  referenceNumber: text('reference_number'),
  mode: text('mode').notNull(),
  status: text('status').notNull().default('submitted'),
  submittedBy: uuid('submitted_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});
