import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const url = process.env.DATABASE_MIGRATE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('Липсва DATABASE_URL');
  process.exit(1);
}

const pendingName = /^00(?:1[4-9]|[2-9]\d)_.*\.sql$/;
const dir = path.join(process.cwd(), 'drizzle', 'migrations');
const files = fs.readdirSync(dir).filter((name) => pendingName.test(name)).sort();
const local = url.includes('localhost') || url.includes('127.0.0.1');

const sql = postgres(url, {
  ssl: local ? false : 'require',
  max: 1,
  connect_timeout: 20,
});

await sql.unsafe(`
  create table if not exists officia_sql_migrations (
    filename text primary key,
    applied_at timestamptz not null default now()
  )
`);

const applied = await sql`select filename from officia_sql_migrations`;
const done = new Set(applied.map((row) => row.filename));

for (const file of files) {
  if (done.has(file)) continue;
  const body = fs.readFileSync(path.join(dir, file), 'utf8');
  await sql.begin(async (tx) => {
    await tx.unsafe(body);
    await tx`insert into officia_sql_migrations (filename) values (${file})`;
  });
  console.log('applied', file);
}

await sql.end({ timeout: 2 });
console.log('sql migrations ready');
