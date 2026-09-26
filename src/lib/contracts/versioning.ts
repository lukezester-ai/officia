import { db } from '@/lib/db/db';
import { contracts, contractVersions } from '@/lib/db/schema/contracts';
import { eq, and } from 'drizzle-orm';
import { requireTenant } from '@/lib/auth/get-tenant';

export interface CreateVersionInput {
  versionNumber: string;
  contentUrl?: string;
}

export async function createVersion(contractId: string, input: CreateVersionInput) {
  const { tenantId } = await requireTenant();
  const [contract] = await db.select({ id: contracts.id }).from(contracts).where(and(
    eq(contracts.id, contractId),
    eq(contracts.tenantId, tenantId),
  )).limit(1);
  if (!contract) throw new Error('Договорът не е от този акаунт.');
  
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
  const { tenantId } = await requireTenant();
  
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
