// @ts-nocheck
import { pgTable, text, timestamp, uuid, date } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { documents } from './documents';

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  documentId: uuid('document_id').references(() => documents.id),
  title: text('title').notNull(),
  description: text('description'),
  dueDate: date('due_date'),
  status: text('status').default('suggested'), // suggested, approved, in_progress, completed, rejected
  priority: text('priority').default('medium'),
  assignee: text('assignee'), // Could be a user ID or role
  createdAt: timestamp('created_at').defaultNow(),
});
