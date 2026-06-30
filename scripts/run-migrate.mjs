import { execSync } from 'node:child_process';
import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: '.env.local' });
dotenv.config();

const url = process.env.DATABASE_URL;

if (!url) {
  console.error('❌ DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const masked = url.replace(/:\/\/([^:]+):([^@]+)@/, '://***:***@');
console.log(`Database: ${masked}`);

const needsSsl =
  url.includes('render.com') ||
  url.includes('sslmode=require') ||
  url.includes('neon.tech') ||
  url.includes('supabase.co');

async function verifyConnection() {
  const sql = postgres(url, {
    max: 1,
    connect_timeout: 15,
    ssl: needsSsl ? 'require' : undefined,
  });

  try {
    await sql`SELECT 1 AS ok`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Cannot connect to PostgreSQL:', message);

    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      console.error('\nLocal Postgres is not running. Start it with:');
      console.error('  docker compose up -d');
      console.error('Then run: npm run db:migrate\n');
    } else if (needsSsl) {
      console.error('\nTip: ensure DATABASE_URL includes ?sslmode=require for cloud Postgres.\n');
    }

    process.exit(1);
  } finally {
    await sql.end();
  }
}

await verifyConnection();

try {
  console.log('Applying database migrations...');
  execSync('npx drizzle-kit migrate', {
    stdio: 'inherit',
    env: process.env,
  });
  console.log('✅ Database migrations applied successfully.');
} catch {
  console.error('❌ drizzle-kit migrate failed.');
  process.exit(1);
}
