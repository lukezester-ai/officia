'use server';

import { revalidatePath } from 'next/cache';
import * as contractService from '@/lib/contracts';
import { CreateContractInput, UpdateContractInput } from '@/lib/contracts/contract-service';
import { AddPartyInput } from '@/lib/contracts/parties';

export async function createContractAction(input: CreateContractInput) {
  const result = await contractService.createContract(input);
  revalidatePath('/[lang]/dashboard/contracts', 'page');
  return result;
}

export async function updateContractAction(id: string, input: UpdateContractInput) {
  const result = await contractService.updateContract(id, input);
  revalidatePath('/[lang]/dashboard/contracts/[id]', 'page');
  revalidatePath('/[lang]/dashboard/contracts', 'page');
  return result;
}

export async function activateContractAction(id: string, _: FormData) {
  await contractService.activateContract(id);
  revalidatePath('/[lang]/dashboard/contracts/[id]', 'page');
  revalidatePath('/[lang]/dashboard/contracts', 'page');
}

export async function terminateContractAction(id: string, _: FormData) {
  await contractService.terminateContract(id);
  revalidatePath('/[lang]/dashboard/contracts/[id]', 'page');
  revalidatePath('/[lang]/dashboard/contracts', 'page');
}

export async function addPartyAction(contractId: string, input: AddPartyInput) {
  const result = await contractService.addParty(contractId, input);
  revalidatePath('/[lang]/dashboard/contracts/[id]', 'page');
  return result;
}

export async function removePartyAction(partyId: string) {
  const result = await contractService.removeParty(partyId);
  revalidatePath('/[lang]/dashboard/contracts/[id]', 'page');
  return result;
}

export async function addVersionAction(contractId: string, versionNumber: string, contentUrl: string) {
  const result = await contractService.createVersion(contractId, { versionNumber, contentUrl });
  revalidatePath('/[lang]/dashboard/contracts/[id]', 'page');
  return result;
}
