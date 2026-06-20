"use server";

import { db } from "@/lib/db/db";
import { aiInboxItems } from "@/lib/db/schema/ai_inbox";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { users } from "@/lib/db/schema/users";

async function getTenantId() {
  const { userId, orgId } = await auth();
  if (!userId) return null;
  const [user] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
  return user?.tenantId || null;
}

export async function getInboxItems() {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error("Unauthorized");
  return db.select().from(aiInboxItems).where(eq(aiInboxItems.tenantId, tenantId)).orderBy(desc(aiInboxItems.createdAt));
}

export async function resolveInboxItem(id: string, resolution: "accepted" | "rejected" | "snoozed" | "resolved") {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error("Unauthorized");
  await db.update(aiInboxItems).set({ status: resolution }).where(and(eq(aiInboxItems.id, id), eq(aiInboxItems.tenantId, tenantId)));
  // In a real scenario, this would also trigger the actual resolution logic (e.g. updating the invoice or transaction)
}
