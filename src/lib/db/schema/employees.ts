import { pgTable, text, timestamp, numeric, uuid, date, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';
import { tenants } from './tenants';

export const contractTypeEnum = pgEnum('contract_type', ['full_time', 'part_time', 'contractor']);

export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(), // Owner/company ID
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  position: text('position'),
  department: text('department'),
  salary: numeric('salary', { precision: 10, scale: 2 }),
  contractType: contractTypeEnum('contract_type').default('full_time'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  isActive: boolean('is_active').default(true),
  workStatus: text('work_status').default('at_work'), // at_work, on_leave, sick_leave, unpaid_leave
  aiStatus: text('ai_status'), // e.g. "missing_contract", "expiring_soon"
  createdAt: timestamp('created_at').defaultNow(),
});
