import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const url = process.env.DATABASE_URL;

if (!url) {
  console.error('DATABASE_URL is missing in .env.local');
  process.exit(1);
}

console.log('DATABASE_URL set:', url.replace(/:\/\/([^:]+):([^@]+)@/, '://***:***@'));

const sql = postgres(url, {
  max: 1,
  connect_timeout: 10,
  ssl: url.includes('render.com') || url.includes('sslmode=require') ? 'require' : undefined,
});

try {
  const ping = await sql`SELECT 1 AS ok`;
  console.log('connection:', ping[0]);

  const migrations = await sql`
    SELECT id, hash, created_at
    FROM drizzle.__drizzle_migrations
    ORDER BY created_at
  `.catch((error) => {
    console.log('drizzle.__drizzle_migrations:', error.message);
    return [];
  });

  console.log('applied migrations:', migrations);

  const tables = await sql`
    SELECT tablename
    FROM pg_tables
    WHERE tablename IN ('product_codes', 'inventory_items')
  `;
  console.log('tables:', tables.map((row) => row.tablename));

  const enums = await sql`
    SELECT typname FROM pg_type WHERE typname = 'product_code_type'
  `;
  console.log('product_code_type enum exists:', enums.length > 0);
} catch (error) {
  console.error('ERR:', error?.message || error);
} finally {
  await sql.end();
}
