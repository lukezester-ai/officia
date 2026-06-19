import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from './src/lib/db/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    await db.execute(sql`DROP TABLE IF EXISTS invoices CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS journal_entries CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS journal_headers CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS tasks CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS documents CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS employees CASCADE`);
    console.log('Tables dropped successfully');
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

main();
