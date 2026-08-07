import { db } from '@/lib/db/db';
import { contractVersions } from '@/lib/db/schema/contracts';
import { eq, and } from 'drizzle-orm';
import { getCurrentTenant } from '@/lib/tenant';

export interface CreateVersionInput {
  versionNumber: string;
  contentUrl?: string;
}

export async function createVersion(contractId: string, input: CreateVersionInput) {
  const tenantId = await getCurrentTenant();
  
  // 1. Mark all existing versions for this contract as not current
  await db.update(contractVersions)
    .set({ isCurrent: false })
    .where(and(
      eq(contractVersions.contractId, contractId),
      eq(contractVersions.tenantId, tenantId)
    ));

  // 2. Insert the new version as current
  const [newVersion] = await db.insert(contractVersions)
    .values({
      tenantId,
      contractId,
      versionNumber: input.versionNumber,
      contentUrl: input.contentUrl,
      isCurrent: true,
    })
    .returning();

  return newVersion;
}

export async function getCurrentVersion(contractId: string) {
  const tenantId = await getCurrentTenant();
  
  const [currentVersion] = await db.select()
    .from(contractVersions)
    .where(and(
      eq(contractVersions.contractId, contractId),
      eq(contractVersions.tenantId, tenantId),
      eq(contractVersions.isCurrent, true)
    ))
    .limit(1);

  return currentVersion || null;
}
