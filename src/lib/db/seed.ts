import { db } from './db';
import { tenants } from './schema/tenants';
import { users } from './schema/users';
import { accountPlan } from './schema/account_plan';
import { invoices } from './schema/invoices';
import { journalHeaders, journalLines } from './schema/journal_entries';

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // 1. Create Tenant
    const [tenant] = await db.insert(tenants).values({
      name: 'Test Company Ltd.',
      domain: 'test.officia.bg',
    }).returning();
    console.log('✅ Created tenant:', tenant.name);

    const suffix = Date.now().toString();
    const [user] = await db.insert(users).values({
      tenantId: tenant.id,
      clerkId: `user_${suffix}`,
      email: `admin_${suffix}@officia.bg`,
      name: 'Admin User',
    }).returning();
    console.log('✅ Created user:', user.email);

    // 3. Create Account Plan (411, 503, 703)
    const [acc411, acc503, acc703] = await db.insert(accountPlan).values([
      { tenantId: tenant.id, accountNumber: '411', name: 'Клиенти', type: 'asset' },
      { tenantId: tenant.id, accountNumber: '503', name: 'Разплащателна сметка в лв', type: 'asset' },
      { tenantId: tenant.id, accountNumber: '703', name: 'Приходи от продажби на услуги', type: 'revenue' },
    ]).returning();
    console.log('✅ Created account plan');

    // 4. Create Invoices
    const [invoice] = await db.insert(invoices).values({
      tenantId: tenant.id,
      userId: user.id,
      invoiceNumber: 'INV-2026-0001',
      clientName: 'TechCorp Bulgaria EOOD',
      amount: '2400.00',
      issueDate: new Date('2026-06-01'),
      dueDate: new Date('2026-06-15'),
      status: 'paid',
    }).returning();
    console.log('✅ Created invoice:', invoice.invoiceNumber);

    // 5. Create Journal Entry (Payment received)
    const [journal] = await db.insert(journalHeaders).values({
      tenantId: tenant.id,
      journalNumber: 'JRN-2026-001',
      entryDate: new Date('2026-06-15'),
      description: 'Плащане по фактура INV-2026-0001',
      status: 'posted',
      postedBy: user.id,
    }).returning();

    await db.insert(journalLines).values([
      { journalId: journal.id, accountId: acc503.id, entryType: 'debit', amount: '2400.00', description: 'Постъпление' },
      { journalId: journal.id, accountId: acc411.id, entryType: 'credit', amount: '2400.00', description: 'Закриване вземане от клиент' },
    ]);
    console.log('✅ Created journal entries');

    console.log('🎉 Seed completed successfully!');
  } catch (err) {
    console.error('❌ Seed failed:', err);
  } finally {
    process.exit(0);
  }
}

seed();
