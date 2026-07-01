import 'server-only';

import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/db';
import { aiConversations, aiMessages } from '@/lib/db/schema/ai_memory';

export type ConversationRole = 'user' | 'assistant' | 'system';

async function getOrCreateConversation(tenantId: string, userId: string) {
  const [existing] = await db
    .select()
    .from(aiConversations)
    .where(and(eq(aiConversations.tenantId, tenantId), eq(aiConversations.userId, userId)))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(aiConversations)
    .values({ tenantId, userId })
    .onConflictDoUpdate({
      target: [aiConversations.tenantId, aiConversations.userId],
      set: { updatedAt: new Date() },
    })
    .returning();

  return created;
}

export async function saveConversationMessage(
  tenantId: string,
  userId: string,
  role: ConversationRole,
  content: string,
  metadata?: Record<string, unknown>,
) {
  const cleanContent = content.trim();
  if (!cleanContent) return null;

  const conversation = await getOrCreateConversation(tenantId, userId);
  const [message] = await db
    .insert(aiMessages)
    .values({
      conversationId: conversation.id,
      tenantId,
      userId,
      role,
      content: cleanContent,
      metadata: metadata ?? null,
    })
    .returning();

  await db
    .update(aiConversations)
    .set({ updatedAt: new Date() })
    .where(eq(aiConversations.id, conversation.id));

  return message;
}

export async function getConversationHistory(tenantId: string, userId: string, limit = 20) {
  const conversation = await getOrCreateConversation(tenantId, userId);
  const recent = await db
    .select({
      role: aiMessages.role,
      content: aiMessages.content,
      createdAt: aiMessages.createdAt,
    })
    .from(aiMessages)
    .where(
      and(
        eq(aiMessages.conversationId, conversation.id),
        eq(aiMessages.tenantId, tenantId),
        eq(aiMessages.userId, userId),
      ),
    )
    .orderBy(desc(aiMessages.createdAt))
    .limit(Math.max(1, Math.min(limit, 100)));

  return recent.reverse();
}

export async function clearConversationHistory(tenantId: string, userId: string) {
  const [conversation] = await db
    .select({ id: aiConversations.id })
    .from(aiConversations)
    .where(and(eq(aiConversations.tenantId, tenantId), eq(aiConversations.userId, userId)))
    .orderBy(asc(aiConversations.createdAt))
    .limit(1);

  if (!conversation) return;
  await db.delete(aiMessages).where(eq(aiMessages.conversationId, conversation.id));
}

export function formatConversationMemory(
  messages: Array<{ role: string; content: string }>,
  maxCharacters = 6_000,
) {
  const formatted = messages
    .map((message) => `${message.role === 'assistant' ? 'Асистент' : 'Потребител'}: ${message.content}`)
    .join('\n');

  return formatted.slice(-maxCharacters);
}
