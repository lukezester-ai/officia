"use server";

import { db } from "@/lib/db/db";
import { aiInboxItems } from "@/lib/db/schema/ai_inbox";
import { and, desc, eq } from "drizzle-orm";
import { requireTenant } from "@/lib/auth/get-tenant";
import { executeApprovedAction } from "@/lib/ai/automation/approval-executors";

export async function getInboxItems() {
  const { tenantId } = await requireTenant();
  return db
    .select()
    .from(aiInboxItems)
    .where(and(eq(aiInboxItems.tenantId, tenantId), eq(aiInboxItems.status, "open")))
    .orderBy(desc(aiInboxItems.createdAt));
}

export async function resolveInboxItem(id: string, resolution: "accepted" | "rejected" | "snoozed" | "resolved") {
  const { tenantId, userId } = await requireTenant();

  const [item] = await db
    .select()
    .from(aiInboxItems)
    .where(and(eq(aiInboxItems.id, id), eq(aiInboxItems.tenantId, tenantId)))
    .limit(1);

  if (!item) {
    return { success: false, error: "Inbox item not found" };
  }

  let executionMessage: string | undefined;

  if (resolution === "accepted" && item.type === "ai_approval_required") {
    const meta = (item.metaJson ?? {}) as {
      actionKey?: string;
      payload?: Record<string, unknown> | null;
    };

    if (meta.actionKey) {
      const result = await executeApprovedAction(
        meta.actionKey,
        tenantId,
        userId,
        meta.payload ?? null,
      );
      executionMessage = result.message;
      if (!result.success) {
        return { success: false, error: result.message };
      }
    }
  }

  await db
    .update(aiInboxItems)
    .set({
      status: resolution,
      updatedAt: new Date(),
      metaJson: {
        ...(item.metaJson as object),
        resolvedAt: new Date().toISOString(),
        executionMessage,
      },
    })
    .where(and(eq(aiInboxItems.id, id), eq(aiInboxItems.tenantId, tenantId)));

  return { success: true, message: executionMessage };
}
