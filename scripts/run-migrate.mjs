import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: '.env.local' });
dotenv.config();

const url = process.env.DATABASE_URL;

if (!url) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

const masked = url.replace(/:\/\/([^:]+):([^@]+)@/, '://***:***@');
console.log(`Database: ${masked}`);

const needsSsl =
  url.includes('render.com') ||
  url.includes('sslmode=require') ||
  url.includes('neon.tech') ||
  url.includes('supabase.co');

function createSql(url) {
  return postgres(url, {
    max: 1,
    connect_timeout: 15,
    ssl: needsSsl ? 'require' : undefined,
    onnotice: () => {},
  });
}

async function tableExists(sql, tableName) {
  const rows = await sql`
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${tableName}
    LIMIT 1
  `;
  return rows.length > 0;
}

async function applySqlFile(sql, relativePath) {
  const filePath = path.join(process.cwd(), relativePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const statements = content
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await sql.unsafe(statement);
  }
}

async function ensureProductCodes(sql) {
  if (await tableExists(sql, 'product_codes')) {
    console.log('✓ product_codes table already exists');
    return;
  }

  if (!(await tableExists(sql, 'inventory_items'))) {
    console.log('⚠ inventory_items not found — skipping product_codes migration');
    return;
  }

  console.log('Applying product_codes migration...');
  await applySqlFile(sql, 'drizzle/migrations/0001_inventory_product_codes.sql');
  console.log('✓ product_codes migration applied');
}

async function runDrizzleKitMigrate() {
  execSync('npx drizzle-kit migrate', {
    stdio: 'inherit',
    env: process.env,
  });
}

const sql = createSql();

try {
  await sql`SELECT 1 AS ok`;
  console.log('✓ Database connection OK');

  const hasCoreSchema = await tableExists(sql, 'tenants');

  if (hasCoreSchema) {
    console.log('✓ Existing schema detected — running incremental migrations only');
    await ensureProductCodes(sql);
  } else {
    console.log('Fresh database — running full drizzle-kit migrate');
    await sql.end({ timeout: 5 });
    runDrizzleKitMigrate();
    console.log('✅ Full database migrations applied');
    process.exit(0);
  }

  console.log('✅ Database ready');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('❌ Migration failed:', message);

  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    console.error('\nStart local Postgres with: docker compose up -d\n');
  }

  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
