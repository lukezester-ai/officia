import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: '.env.local' });
dotenv.config();

const rawUrl = process.env.DATABASE_URL;

if (!rawUrl) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

function normalizeDatabaseUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('channel_binding');
    return parsed.toString();
  } catch {
    return url
      .replace(/([?&])channel_binding=[^&]*(&)?/g, (_, sep, amp) => (amp ? sep : ''))
      .replace(/[?&]$/, '');
  }
}

function needsPostgresSsl(url) {
  return (
    url.includes('neon.tech') ||
    url.includes('render.com') ||
    url.includes('sslmode=require') ||
    url.includes('supabase.co')
  );
}

function formatError(error) {
  if (error instanceof AggregateError && error.errors?.length) {
    return error.errors.map(formatError).join(' | ');
  }
  if (error instanceof Error) {
    return error.message || error.stack || error.name;
  }
  return String(error);
}

const url = normalizeDatabaseUrl(rawUrl);
process.env.DATABASE_URL = url;

const masked = url.replace(/:\/\/([^:]+):([^@]+)@/, '://***:***@');
console.log(`Database: ${masked}`);

function createSql() {
  return postgres(url, {
    max: 1,
    connect_timeout: 30,
    prepare: false,
    ssl: needsPostgresSsl(url) ? 'require' : undefined,
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

async function ensureTenantBilling(sql) {
  const rows = await sql`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'trial_ends_at'
    LIMIT 1
  `;
  if (rows.length > 0) {
    console.log('✓ tenant billing columns already exist');
    return;
  }

  console.log('Applying tenant billing migration...');
  await applySqlFile(sql, 'drizzle/migrations/0002_tenant_billing.sql');
  console.log('✓ tenant billing migration applied');
}

async function ensureRlsRbacNapBank(sql) {
  if (await tableExists(sql, 'user_roles')) {
    console.log('✓ RLS/RBAC/NAP migration already applied');
    return;
  }

  console.log('Applying RLS/RBAC/NAP/bank migration...');
  await applySqlFile(sql, 'drizzle/migrations/0003_rls_rbac_nap_bank.sql');
  console.log('✓ RLS/RBAC/NAP/bank migration applied');
}

async function ensureAiMemoryRag(sql) {
  if (await tableExists(sql, 'document_embeddings')) {
    console.log('✓ AI memory/RAG migration already applied');
    return;
  }

  console.log('Applying AI memory/RAG migration...');
  await applySqlFile(sql, 'drizzle/migrations/0004_ai_memory_rag.sql');
  console.log('✓ AI memory/RAG migration applied');
}

async function ensurePayroll(sql) {
  if (await tableExists(sql, 'payroll_batches')) {
    console.log('✓ payroll migration already applied');
    return;
  }

  console.log('Applying payroll migration...');
  await applySqlFile(sql, 'drizzle/migrations/0005_payroll.sql');
  console.log('✓ payroll migration applied');
}

async function ensureHrCoreUpgrade(sql) {
  if (await tableExists(sql, 'employment_contracts')) {
    console.log('✓ HR core upgrade already applied');
    return;
  }
  console.log('Applying HR core upgrade...');
  await applySqlFile(sql, 'drizzle/migrations/0006_hr_core_upgrade.sql');
  console.log('✓ HR core upgrade applied');
}

async function ensurePayrollRateComponents(sql) {
  if (await tableExists(sql, 'contribution_rate_components')) {
    console.log('✓ payroll rate components already applied');
    return;
  }
  console.log('Applying payroll rate components...');
  await applySqlFile(sql, 'drizzle/migrations/0007_payroll_rate_components.sql');
  console.log('✓ payroll rate components applied');
}

async function columnExists(sql, tableName, columnName) {
  const rows = await sql`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${tableName} AND column_name = ${columnName}
    LIMIT 1
  `;
  return rows.length > 0;
}

async function ensureAuthUserColumns(sql) {
  if (await columnExists(sql, 'users', 'two_factor_secret')) {
    console.log('✓ auth user columns already applied');
    return;
  }
  console.log('Applying auth user columns safety migration...');
  await applySqlFile(sql, 'drizzle/migrations/0008_auth_users_safety.sql');
  console.log('✓ auth user columns safety migration applied');
}

async function ensureNordigenTenantKeys(sql) {
  if (await columnExists(sql, 'tenants', 'nordigen_secret_id')) {
    console.log('✓ nordigen tenant keys already applied');
    return;
  }
  console.log('Applying nordigen tenant keys migration...');
  await applySqlFile(sql, 'drizzle/migrations/0011_nordigen_tenant_keys.sql');
  console.log('✓ nordigen tenant keys migration applied');
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
    await ensureTenantBilling(sql);
    await ensureRlsRbacNapBank(sql);
    await ensureAiMemoryRag(sql);
    await ensurePayroll(sql);
    await ensureHrCoreUpgrade(sql);
    await ensurePayrollRateComponents(sql);
    await ensureAuthUserColumns(sql);
    await ensureNordigenTenantKeys(sql);
  } else {
    console.log('Fresh database — running full drizzle-kit migrate');
    await sql.end({ timeout: 5 });
    runDrizzleKitMigrate();
    console.log('✅ Full database migrations applied');
    process.exit(0);
  }

  console.log('✅ Database ready');
} catch (error) {
  console.error('❌ Migration failed:', formatError(error));

  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    console.error('\nStart local Postgres with: docker compose up -d\n');
  }

  process.exit(1);
} finally {
  await sql.end({ timeout: 5 }).catch(() => undefined);
}
