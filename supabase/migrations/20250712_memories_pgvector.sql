-- Supabase SQL migration: enable pgvector and create memories table
-- Run this in Supabase SQL Editor

-- 1. Enable extension
create extension if not exists vector;

-- 2. Create memories table
create table if not exists memories (
  id uuid default gen_random_uuid() primary key,
  client_id uuid not null references tenants(id) on delete cascade,
  content text not null,
  embedding vector(1024) not null,
  memory_type text not null default 'fact'
    check (memory_type in ('preference', 'fact', 'history')),
  metadata jsonb default '{}',
  last_accessed_at timestamptz default now() not null,
  access_count integer default 0 not null,
  created_at timestamptz default now() not null
);

-- 3. HNSW index за бърз cosine similarity search
create index if not exists embedding_hnsw_idx
  on memories using hnsw (embedding vector_cosine_ops);

create index if not exists memories_client_id_idx
  on memories (client_id);

-- 4. Row Level Security – клиент вижда само своята памет
alter table memories enable row level security;

create policy "clients_see_own_memories"
  on memories for all
  using (client_id = auth.uid());

-- 5. Cleanup функции
create or replace function cleanup_stale_history()
returns void as $$
  delete from memories
  where memory_type = 'history'
    and created_at < now() - interval '6 months'
    and access_count = 0;
$$ language sql security definer;

create or replace function cleanup_unused_memories()
returns void as $$
  delete from memories
  where memory_type = 'history'
    and last_accessed_at < now() - interval '90 days'
    and access_count <= 1;
$$ language sql security definer;
