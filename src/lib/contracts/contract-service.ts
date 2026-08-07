import { db } from '@/lib/db/db';
import { contracts, contractParties, contractVersions } from '@/lib/db/schema/contracts';
import { eq, and } from 'drizzle-orm';
import { getCurrentTenant } from '@/lib/tenant';

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
  const tenantId = await getCurrentTenant();
  
  const [newContract] = await db.insert(contracts).values({
    tenantId,
    title: input.title,
    description: input.description,
    startDate: input.startDate,
    endDate: input.endDate,
    status: 'draft',
  }).returning();

  return newContract;
}

export async function getContractById(id: string) {
  const tenantId = await getCurrentTenant();
  
  const [contract] = await db.select()
    .from(contracts)
    .where(and(eq(contracts.id, id), eq(contracts.tenantId, tenantId)))
    .limit(1);
    
  if (!contract) return null;

  const parties = await db.select()
    .from(contractParties)
    .where(eq(contractParties.contractId, id));
    
  const versions = await db.select()
    .from(contractVersions)
    .where(eq(contractVersions.contractId, id));

  const currentVersion = versions.find(v => v.isCurrent) || null;

  return {
    ...contract,
    parties,
    versions,
    currentVersion,
  };
}

export async function getContracts() {
  const tenantId = await getCurrentTenant();
  return db.select().from(contracts).where(eq(contracts.tenantId, tenantId));
}

export async function updateContract(id: string, input: UpdateContractInput) {
  const tenantId = await getCurrentTenant();
  
  const [updatedContract] = await db.update(contracts)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(and(eq(contracts.id, id), eq(contracts.tenantId, tenantId)))
    .returning();
    
  return updatedContract;
}
