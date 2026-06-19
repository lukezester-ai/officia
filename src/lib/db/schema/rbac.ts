// @ts-nocheck
import { pgTable, uuid, varchar, text, boolean, timestamp, primaryKey, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id), // Може да е null за системни роли
  name: varchar('name', { length: 50 }).notNull(), // owner, senior_accountant, junior_accountant, auditor, tax_consultant
  description: text('description'),
  isSystem: boolean('is_system').default(false),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  unq: unique().on(t.tenantId, t.name),
}));

export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  resource: varchar('resource', { length: 50 }).notNull(), // invoice, journal, employee, document, report, vat
  action: varchar('action', { length: 50 }).notNull(), // create, read, update, delete, post, approve, export
}, (t) => ({
  unq: unique().on(t.resource, t.action),
}));

export const rolePermissions = pgTable('role_permissions', {
  roleId: uuid('role_id').references(() => roles.id).notNull(),
  permissionId: uuid('permission_id').references(() => permissions.id).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.roleId, t.permissionId] }),
}));
