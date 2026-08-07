import { db } from '@/lib/db/db';
import { contracts } from '@/lib/db/schema/contracts';
import { eq, and } from 'drizzle-orm';
import { getCurrentTenant } from '@/lib/tenant';
import { getContractById } from './contract-service';
import { logAiAction } from '@/lib/ai/audit/audit-logger';

export async function activateContract(id: string) {
  const tenantId = await getCurrentTenant();
  
  const contract = await getContractById(id);
  if (!contract) {
    throw new Error('Договорът не е намерен');
  }

  if (contract.status !== 'draft') {
    throw new Error('Само договори в статус draft могат да бъдат активирани');
  }

  if (!contract.currentVersion) {
    throw new Error('Договорът трябва да има поне една добавена версия (документ), за да бъде активиран');
  }

  if (contract.parties.length === 0) {
    throw new Error('Договорът трябва да има поне една добавена страна (party), за да бъде активиран');
  }

  const [updated] = await db.update(contracts)
    .set({ 
      status: 'active',
      updatedAt: new Date()
    })
    .where(and(eq(contracts.id, id), eq(contracts.tenantId, tenantId)))
    .returning();

  await logAiAction({
    tenantId,
    action: 'ACTIVATE_CONTRACT',
    tableName: 'contracts',
    recordId: id,
    metadata: { status: 'active' },
  });

  return updated;
}

export async function terminateContract(id: string) {
  const tenantId = await getCurrentTenant();
  
  const [updated] = await db.update(contracts)
    .set({ 
      status: 'terminated',
      updatedAt: new Date()
    })
    .where(and(eq(contracts.id, id), eq(contracts.tenantId, tenantId)))
    .returning();

  await logAiAction({
    tenantId,
    action: 'TERMINATE_CONTRACT',
    tableName: 'contracts',
    recordId: id,
    metadata: { status: 'terminated' },
  });

  return updated;
}

export async function expireContract(id: string) {
  const tenantId = await getCurrentTenant();
  
  const [updated] = await db.update(contracts)
    .set({ 
      status: 'expired',
      updatedAt: new Date()
    })
    .where(and(eq(contracts.id, id), eq(contracts.tenantId, tenantId)))
    .returning();

  await logAiAction({
    tenantId,
    action: 'EXPIRE_CONTRACT',
    tableName: 'contracts',
    recordId: id,
    metadata: { status: 'expired' },
  });

  return updated;
}

