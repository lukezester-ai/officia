import { pgTable, text, uuid, timestamp, numeric, pgEnum, boolean, uniqueIndex } from 'drizzle-orm/pg-core';
import { companyDivisions } from './company_structure';
import { accountPlan } from './account_plan';

export const movementTypeEnum = pgEnum('movement_type', ['in', 'out', 'transfer', 'adjustment']);
export const productCodeTypeEnum = pgEnum('product_code_type', ['ean', 'sku', 'supplier', 'internal', 'other']);

export const inventoryItems = pgTable('inventory_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  sku: text('sku').notNull(),
  name: text('name').notNull(),
  unitOfMeasure: text('unit_of_measure').notNull(), // бр, кг, литър
  inventoryAccountId: uuid('inventory_account_id').references(() => accountPlan.id), // Сметка 302, 304
  costingMethod: text('costing_method').default('fifo'), // 'fifo', 'lifo', 'weighted_average'
});

export const inventoryMovements = pgTable('inventory_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  itemId: uuid('item_id').references(() => inventoryItems.id).notNull(),
  divisionId: uuid('division_id').references(() => companyDivisions.id).notNull(), // Склад / Обект
  type: movementTypeEnum('type').notNull(),
  quantity: numeric('quantity', { precision: 15, scale: 3 }).notNull(),
  unitCost: numeric('unit_cost', { precision: 15, scale: 4 }), // Себестойност
  totalCost: numeric('total_cost', { precision: 15, scale: 2 }),
  movementDate: timestamp('movement_date').notNull(),
  referenceId: uuid('reference_id'), // Фактура или друг първичен документ
});

export const productCodes = pgTable(
  'product_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    itemId: uuid('item_id')
      .references(() => inventoryItems.id, { onDelete: 'cascade' })
      .notNull(),
    code: text('code').notNull(),
    codeType: productCodeTypeEnum('code_type').notNull().default('other'),
    isPrimary: boolean('is_primary').default(false),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [uniqueIndex('product_codes_tenant_code_idx').on(table.tenantId, table.code)],
);
