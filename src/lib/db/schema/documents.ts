import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  title: text('title').notNull(),
  type: text('type').notNull(), // 'contract', 'order', 'invoice', etc.
  fileUrl: text('file_url'),
  contentExtracted: text('content_extracted'), // raw text from OCR/Parser
  metadata: jsonb('metadata'), // Any structured data
  status: text('status').default('pending_analysis'), // pending_analysis, analyzed, active, archived
  aiStatus: text('ai_status'), // e.g. 'processed', 'needs_review'
  aiSummary: text('ai_summary'),
  createdAt: timestamp('created_at').defaultNow(),
});
