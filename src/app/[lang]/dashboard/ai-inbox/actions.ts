"use server";

import { db } from "@/lib/db/db";
import { aiInboxItems } from "@/lib/db/schema/ai_inbox";
import { and, desc, eq } from "drizzle-orm";
import { requireTenant } from "@/lib/auth/get-tenant";
import { executeApprovedAction } from "@/lib/ai/automation/approval-executors";
import { roleCan } from "@/lib/auth/rbac";

export async function getInboxItems() {
  const { tenantId } = await requireTenant();
  return db
    .select()
    .from(aiInboxItems)
    .where(and(eq(aiInboxItems.tenantId, tenantId), eq(aiInboxItems.status, "open")))
    .orderBy(desc(aiInboxItems.createdAt));
}

export async function resolveInboxItem(id: string, resolution: "accepted" | "rejected" | "snoozed" | "resolved") {
  const { tenantId, user, role } = await requireTenant();

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
    if (!roleCan(role, 'ai:approve')) {
      return { success: false, error: 'Нямате право да одобрявате AI операции.' };
    }

    const [claimed] = await db
      .update(aiInboxItems)
      .set({ status: 'processing', updatedAt: new Date() })
      .where(
        and(
          eq(aiInboxItems.id, id),
          eq(aiInboxItems.tenantId, tenantId),
          eq(aiInboxItems.status, 'open'),
        ),
      )
      .returning({ id: aiInboxItems.id });

    if (!claimed) {
      return { success: false, error: 'Тази AI операция вече се обработва или е приключена.' };
    }

    const meta = (item.metaJson ?? {}) as {
      actionKey?: string;
      payload?: Record<string, unknown> | null;
    };

    if (meta.actionKey) {
      try {
        const result = await executeApprovedAction(
          meta.actionKey,
          tenantId,
          user.id,
          meta.payload ?? null,
        );
        executionMessage = result.message;
        if (!result.success) {
          await db
            .update(aiInboxItems)
            .set({ status: 'open', updatedAt: new Date() })
            .where(and(eq(aiInboxItems.id, id), eq(aiInboxItems.tenantId, tenantId)));
          return { success: false, error: result.message };
        }
      } catch (error) {
        await db
          .update(aiInboxItems)
          .set({ status: 'open', updatedAt: new Date() })
          .where(and(eq(aiInboxItems.id, id), eq(aiInboxItems.tenantId, tenantId)));
        return {
          success: false,
          error: error instanceof Error ? error.message : 'AI операцията не можа да бъде изпълнена.',
        };
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
