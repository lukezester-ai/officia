import { contracts, contractParties, contractVersions } from '@/lib/db/schema/contracts';
import { eq, and } from 'drizzle-orm';
import { getRequestRlsContext } from '@/lib/auth/rls-context';
import { withTenantContext } from '@/lib/db/rls';

export interface CreateContractInput {
  title: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface UpdateContractInput {
  title?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
}

export async function createContract(input: CreateContractInput) {
  const ctx = await getRequestRlsContext();

  return withTenantContext(ctx, async (tx) => {
    const [newContract] = await tx.insert(contracts).values({
      tenantId: ctx.tenantId,
      title: input.title,
      description: input.description,
      startDate: input.startDate,
      endDate: input.endDate,
      status: 'draft',
    }).returning();

    return newContract;
  });
}

export async function getContractById(id: string) {
  const ctx = await getRequestRlsContext();

  return withTenantContext(ctx, async (tx) => {
    const [contract] = await tx.select()
      .from(contracts)
      .where(and(eq(contracts.id, id), eq(contracts.tenantId, ctx.tenantId)))
      .limit(1);

    if (!contract) return null;

    const parties = await tx.select()
      .from(contractParties)
      .where(eq(contractParties.contractId, id));

    const versions = await tx.select()
      .from(contractVersions)
      .where(eq(contractVersions.contractId, id));

    return {
      ...contract,
      parties,
      versions,
      currentVersion: versions.find(v => v.isCurrent) || null,
    };
  });
}

export async function getContracts() {
  const ctx = await getRequestRlsContext();

  return withTenantContext(ctx, async (tx) => {
    return tx.select().from(contracts).where(eq(contracts.tenantId, ctx.tenantId));
  });
}

export async function updateContract(id: string, input: UpdateContractInput) {
  const ctx = await getRequestRlsContext();

  return withTenantContext(ctx, async (tx) => {
    const [updatedContract] = await tx.update(contracts)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(eq(contracts.id, id), eq(contracts.tenantId, ctx.tenantId)))
      .returning();

    return updatedContract;
  });
}