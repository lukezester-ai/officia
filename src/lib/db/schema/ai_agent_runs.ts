import { pgTable, text, timestamp, uuid, jsonb, integer } from 'drizzle-orm/pg-core';

/**
 * Lightweight tracking for cross-agent pipelines (Officia 1.5).
 * Not a full workflow engine — correlation + audit only.
 */
export const aiAgentRuns = pgTable('ai_agent_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  correlationId: uuid('correlation_id').notNull(),
  pipeline: text('pipeline').notNull(), // document_lifecycle | bank_sync | month_close | chat_route
  status: text('status').notNull().default('running'), // running | waiting_approval | completed | failed | partial
  currentStep: text('current_step'),
  stepsCompleted: integer('steps_completed').default(0),
  stepsTotal: integer('steps_total').default(0),
  sourceType: text('source_type'),
  sourceId: text('source_id'),
  summary: text('summary'),
  metaJson: jsonb('meta_json'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
