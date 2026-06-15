import { pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const companyDivisions = pgTable('company_divisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  parentDivisionId: uuid('parent_division_id'), // за йерархия
  location: text('location'),
  costCenter: text('cost_center'), // Разходен център
  profitCenter: text('profit_center'), // Печеливш център
});
