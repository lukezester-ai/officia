import { db } from '@/lib/db/db';
import { memories } from '@/lib/db/schema/memories';
import { embedText } from '@/lib/ai/embeddings';
import { and, desc, eq } from 'drizzle-orm';

export async function saveConversationMessage(tenantId: string, userId: string, role: string, content: string) {
  if (!tenantId || !userId || !content?.trim()) {
    throw new Error('Запис на разговор изисква tenant, потребител и съдържание.');
  }
  const embedding = await embedText(`${role}: ${content}`);
  await db.insert(memories).values({
    clientId: tenantId,
    content,
    embedding,
    memoryType: 'history',
    metadata: { userId, role },
  });
}

export async function getConversationHistory(tenantId: string, userId: string, limit: number = 20) {
  if (!tenantId || !userId) return [];
  return db
    .select()
    .from(memories)
    .where(and(eq(memories.clientId, tenantId), eq(memories.memoryType, 'history')))
    .orderBy(desc(memories.createdAt))
    .limit(limit);
}
