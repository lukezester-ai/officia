import * as crypto from 'crypto';
import { and, eq, sql } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { webhooks } from '../db/schema/webhooks';

type WebhookRecord = InferSelectModel<typeof webhooks>;

// Mock DB wrapper (докато не импортираме реалната връзка)
const db = {
  select: () => ({
    from: (_table: typeof webhooks) => ({
      where: async (_condition: unknown): Promise<WebhookRecord[]> => [],
    }),
  }),
};

export async function triggerWebhook(tenantId: string, event: string, payload: any) {
  const activeWebhooks = await db.select().from(webhooks).where(and(
    eq(webhooks.tenantId, tenantId),
    sql`${event} = ANY(events)`,
    eq(webhooks.isActive, true)
  ));
  
  for (const webhook of activeWebhooks) {
    const signature = crypto.createHmac('sha256', webhook.secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': event,
      },
      body: JSON.stringify(payload),
    });
  }
}
