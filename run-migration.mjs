// run-migration.mjs - Изпълнява pgvector migration в Render PostgreSQL
// Стартирайте с: node run-migration.mjs

import { readFileSync } from 'fs';

// Взимаме DATABASE_URL от .env.local
const envContent = readFileSync('.env.local', 'utf-8');
const dbUrlMatch = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);

if (!dbUrlMatch) {
  console.error('❌ DATABASE_URL не е намерен в .env.local');
  process.exit(1);
}

const DATABASE_URL = dbUrlMatch[1];
console.log('🔗 Свързване към базата данни...');

// Динамичен импорт на postgres
const { default: postgres } = await import('postgres');
const sql = postgres(DATABASE_URL, { ssl: 'require' });

try {
  console.log('⚙️  Изпълняване на migration...');

  await sql.unsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
  console.log('✅ pgvector extension активирана');

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS memories (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      client_id uuid NOT NULL,
      content text NOT NULL,
      embedding vector(1024) NOT NULL,
      memory_type text NOT NULL DEFAULT 'fact'
        CHECK (memory_type IN ('preference', 'fact', 'history')),
      metadata jsonb DEFAULT '{}',
      last_accessed_at timestamptz DEFAULT now() NOT NULL,
      access_count integer DEFAULT 0 NOT NULL,
      created_at timestamptz DEFAULT now() NOT NULL
    );
  `);
  console.log('✅ Таблица memories създадена');

  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS embedding_hnsw_idx
      ON memories USING hnsw (embedding vector_cosine_ops);
  `);
  console.log('✅ HNSW index създаден');

  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS memories_client_id_idx
      ON memories (client_id);
  `);
  console.log('✅ client_id index създаден');

  console.log('\n🎉 Migration завърши успешно!');
} catch (err) {
  console.error('❌ Грешка:', err.message);
} finally {
  await sql.end();
}
