// @ts-nocheck
// src/lib/db/schema/memories.ts
// pgvector-based memory table for AI assistant client isolation

import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

// pgvector custom type (Drizzle нняма native vector type)
const vector = customType<{ data: number[] }>({
  dataType() {
    return "vector(1024)"; // voyage-3 dimension
  },
  toDriver(value: number[]) {
    return JSON.stringify(value);
  },
  fromDriver(value: unknown) {
    if (typeof value === "string") return JSON.parse(value);
    return value as number[];
  },
});

export const memories = pgTable(
  "memories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Изолация между клиенти на Officia – задължително
    clientId: uuid("client_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    embedding: vector("embedding").notNull(),
    // 'preference' | 'fact' | 'history'
    memoryType: text("memory_type").notNull().default("fact"),
    metadata: jsonb("metadata").default({}),
    // Usage tracking за cleanup механизма
    lastAccessedAt: timestamp("last_accessed_at").defaultNow().notNull(),
    accessCount: integer("access_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    // HNSW индекс за бърз cosine similarity search
    embeddingIdx: index("embedding_hnsw_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
    clientIdx: index("memories_client_id_idx").on(table.clientId),
  })
);
