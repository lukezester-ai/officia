import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const waitlist = pgTable('waitlist', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
