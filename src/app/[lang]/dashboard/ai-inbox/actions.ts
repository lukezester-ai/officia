"use server";

import { db } from "@/lib/db/db";
import { aiInboxItems } from "@/lib/db/schema/ai_inbox";
import { and, desc, eq } from "drizzle-orm";
import { requireTenant } from "@/lib/auth/get-tenant";

export async function getInboxItems() {
  const { tenantId } = await requireTenant();
  return db
    .select()
    .from(aiInboxItems)
    .where(and(eq(aiInboxItems.tenantId, tenantId), eq(aiInboxItems.status, "open")))
    .orderBy(desc(aiInboxItems.createdAt));
}

export async function resolveInboxItem(id: string, resolution: "accepted" | "rejected" | "snoozed" | "resolved") {
  const { tenantId } = await requireTenant();
  await db
    .update(aiInboxItems)
    .set({ status: resolution, updatedAt: new Date() })
    .where(and(eq(aiInboxItems.id, id), eq(aiInboxItems.tenantId, tenantId)));
  return { success: true };
}
