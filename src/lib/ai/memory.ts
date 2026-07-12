// src/lib/ai/memory.ts
// Memory retrieval и writing за AI асистента на Officia

import { db } from "@/lib/db";
import { memories } from "@/lib/db/schema/memories";
import { embedText } from "@/lib/ai/embeddings";
import { sql } from "drizzle-orm";

export type MemoryType = "preference" | "fact" | "history";

export interface Memory {
  id: string;
  content: string;
  memoryType: MemoryType;
  metadata: Record<string, unknown>;
  createdAt: Date;
  accessCount: number;
}

/**
 * Извлича top-K релевантни спомени за даден клиент.
 * Използва cosine similarity (<=> оператор в pgvector).
 */
export async function getRelevantMemories(
  clientId: string,
  query: string,
  topK = 5
): Promise<Memory[]> {
  const queryEmbedding = await embedText(query);

  // Retrieve и update access stats едновременно
  const results = await db.execute(sql`
    WITH ranked AS (
      SELECT id, content, memory_type, metadata, created_at, access_count
      FROM memories
      WHERE client_id = ${clientId}
      ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
      LIMIT ${topK}
    )
    UPDATE memories
    SET
      last_accessed_at = now(),
      access_count = memories.access_count + 1
    FROM ranked
    WHERE memories.id = ranked.id
    RETURNING
      memories.id,
      memories.content,
      memories.memory_type as "memoryType",
      memories.metadata,
      memories.created_at as "createdAt",
      memories.access_count as "accessCount"
  `);

  return results as unknown as Memory[];
}

/**
 * Записва нов спомен за клиент.
 */
export async function writeMemory(params: {
  clientId: string;
  content: string;
  memoryType: MemoryType;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const { clientId, content, memoryType, metadata = {} } = params;

  const embedding = await embedText(content);

  const [record] = await db
    .insert(memories)
    .values({
      clientId,
      content,
      embedding,
      memoryType,
      metadata,
    })
    .returning({ id: memories.id });

  return record.id;
}

/**
 * Форматира спомените като контекст за Claude system prompt.
 */
export function formatMemoriesForPrompt(mems: Memory[]): string {
  if (mems.length === 0) return "";

  const grouped = {
    preference: mems.filter((m) => m.memoryType === "preference"),
    fact: mems.filter((m) => m.memoryType === "fact"),
    history: mems.filter((m) => m.memoryType === "history"),
  };

  const sections: string[] = [];

  if (grouped.preference.length > 0) {
    sections.push(
      `## Предпочитания на клиента\n${grouped.preference.map((m) => `- ${m.content}`).join("\n")}`
    );
  }

  if (grouped.fact.length > 0) {
    sections.push(
      `## Важни факти\n${grouped.fact.map((m) => `- ${m.content}`).join("\n")}`
    );
  }

  if (grouped.history.length > 0) {
    sections.push(
      `## Минали взаимодействия\n${grouped.history.map((m) => `- ${m.content}`).join("\n")}`
    );
  }

  return `\n\n# Памет за клиента\n${sections.join("\n\n")}`;
}

/**
 * Извлича важни факти от разговор чрез Claude.
 * Извиква се след края на всяка сесия.
 */
export async function extractAndSaveMemories(params: {
  clientId: string;
  conversationText: string;
  anthropicApiKey: string;
}): Promise<number> {
  const { clientId, conversationText, anthropicApiKey } = params;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicApiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `Извлечи факти от разговора, които си струва да запомним за бъдещи сесии с клиента. Фокусирай се само на:
1. Предпочитания ("preference"): как клиентът иска да работи, формат на документи и т.н.
2. Важни факти ("fact"): ЕИК, банкови детайли, специфики на бизнеса.
3. НЕ запомняй общи разговори или временен контекст.

Разговор:
${conversationText}

Върни JSON масив или празен масив:
[{"content": "...", "type": "preference"|"fact"}]`,
        },
      ],
    }),
  });

  if (!response.ok) return 0;

  const data = await response.json();
  const text = data.content?.[0]?.text ?? "[]";

  let facts: Array<{ content: string; type: "preference" | "fact" }> = [];
  try {
    facts = JSON.parse(text);
  } catch {
    return 0;
  }

  for (const fact of facts) {
    await writeMemory({
      clientId,
      content: fact.content,
      memoryType: fact.type,
    });
  }

  return facts.length;
}
