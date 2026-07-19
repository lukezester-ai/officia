// @ts-nocheck
import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db/db';
import { aiInboxItems } from '@/lib/db/schema/ai_inbox';
import { logActivity } from '@/lib/activity-logger';
import type { AiEvent } from './types';

type EventHandler = (event: AiEvent) => Promise<void> | void;

const handlers = new Map<string, EventHandler[]>();

/** Subscribe to an AI event type (in-process bus for same request / cron). */
export function onAiEvent(type: string, handler: EventHandler) {
  const list = handlers.get(type) ?? [];
  list.push(handler);
  handlers.set(type, list);
  return () => {
    const next = (handlers.get(type) ?? []).filter((h) => h !== handler);
    handlers.set(type, next);
  };
}

/**
 * Publish an AI event: notify in-process handlers, write activity log,
 * and optionally open an inbox item for human-visible signals.
 */
export async function publishAiEvent(
  event: AiEvent,
  options?: { openInbox?: boolean; inboxTitle?: string; priority?: string },
) {
  const enriched: AiEvent = {
    ...event,
    correlationId: event.correlationId || randomUUID(),
  };

  // Activity trail (entityId must be UUID)
  const entityId = looksLikeUuid(enriched.sourceId) ? enriched.sourceId! : enriched.correlationId;
  await logActivity(
    enriched.tenantId,
    enriched.userId ?? null,
    enriched.type,
    enriched.sourceType || 'ai_event',
    entityId,
    enriched.message || JSON.stringify(enriched.payload ?? {}),
  );

  if (options?.openInbox) {
    await db.insert(aiInboxItems).values({
      tenantId: enriched.tenantId,
      type: enriched.type,
      sourceType: enriched.sourceType || 'ai_pipeline',
      sourceId: enriched.sourceId || enriched.correlationId,
      title: options.inboxTitle || enriched.message || enriched.type,
      description: enriched.message,
      confidence: '0.90',
      status: 'open',
      priority: options.priority || 'normal',
      metaJson: {
        correlationId: enriched.correlationId,
        payload: enriched.payload ?? null,
      },
    });
  }

  const list = [
    ...(handlers.get(enriched.type) ?? []),
    ...(handlers.get('*') ?? []),
  ];
  for (const handler of list) {
    try {
      await handler(enriched);
    } catch (err) {
      console.error(`[AI Event Bus] handler failed for ${enriched.type}`, err);
    }
  }

  return enriched;
}

function looksLikeUuid(value?: string | null) {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
