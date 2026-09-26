'use server';

import { revalidatePath } from 'next/cache';
import * as contractService from '@/lib/contracts';
import { UpdateContractInput } from '@/lib/contracts/contract-service';
import { saveContractFile } from '@/lib/contracts/files';
import { AddPartyInput } from '@/lib/contracts/parties';
import { requireTenant } from '@/lib/auth/get-tenant';

export async function createContractAction(input: {
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  counterpartyId?: string;
}) {
  try {
    const title = input.title.trim();
    if (title.length < 2 || title.length > 255) {
      return { success: false as const, error: 'Името на договора е между 2 и 255 знака.' };
    }
    const startDate = parseContractDate(input.startDate);
    const endDate = parseContractDate(input.endDate);
    if (startDate && endDate && endDate < startDate) {
      return { success: false as const, error: 'Крайната дата е след началната.' };
    }
    const result = await contractService.createContract({
      title,
      description: input.description?.trim() || undefined,
      startDate,
      endDate,
      counterpartyId: input.counterpartyId || undefined,
    });
    revalidatePath('/', 'layout');
    return { success: true as const, id: result.id };
  } catch (error: unknown) {
    console.error('[createContract]', error);
    const message = error instanceof Error ? error.message : '';
    if (message === 'Клиентът не е от този акаунт.') return { success: false as const, error: message };
    if (message === 'bad date') return { success: false as const, error: 'Датата е невалидна.' };
    return { success: false as const, error: 'Договорът не беше записан.' };
  }
}

function parseContractDate(value?: string) {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('bad date');
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error('bad date');
  return date;
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

export async function addContractFileAction(contractId: string, formData: FormData) {
  try {
    const file = formData.get('file');
    if (!(file instanceof File)) return { success: false as const, error: 'Избери файл.' };
    const versionNumber = String(formData.get('versionNumber') || '1').trim();
    if (versionNumber.length < 1 || versionNumber.length > 20) {
      return { success: false as const, error: 'Номерът на версията е до 20 знака.' };
    }
    const { tenantId } = await requireTenant();
    const saved = await saveContractFile(tenantId, contractId, file);
    await contractService.createVersion(contractId, {
      versionNumber,
      contentUrl: saved.relative,
    });
    revalidatePath('/', 'layout');
    return { success: true as const };
  } catch (error: unknown) {
    console.error('[contract-file]', error);
    const message = error instanceof Error ? error.message : '';
    if (message.startsWith('Файлът') || message === 'Договорът не е от този акаунт.') {
      return { success: false as const, error: message };
    }
    return { success: false as const, error: 'Файлът не беше качен.' };
  }
}
