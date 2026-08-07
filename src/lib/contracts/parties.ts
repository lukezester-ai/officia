import { db } from '@/lib/db/db';
import { contractParties } from '@/lib/db/schema/contracts';
import { eq, and } from 'drizzle-orm';
import { getCurrentTenant } from '@/lib/tenant';

export interface AddPartyInput {
  partyName: string;
  partyRole?: string;
  contactEmail?: string;
}

export async function addParty(contractId: string, input: AddPartyInput) {
  const tenantId = await getCurrentTenant();
  
  const [newParty] = await db.insert(contractParties)
    .values({
      tenantId,
      contractId,
      partyName: input.partyName,
      partyRole: input.partyRole,
      contactEmail: input.contactEmail,
    })
    .returning();

  return newParty;
}

export async function removeParty(partyId: string) {
  const tenantId = await getCurrentTenant();
  
  const [deletedParty] = await db.delete(contractParties)
    .where(and(
      eq(contractParties.id, partyId),
      eq(contractParties.tenantId, tenantId)
    ))
    .returning();

  return deletedParty;
}

export async function getPartiesForContract(contractId: string) {
  const tenantId = await getCurrentTenant();
  
  return db.select()
    .from(contractParties)
    .where(and(
      eq(contractParties.contractId, contractId),
      eq(contractParties.tenantId, tenantId)
    ));
}
