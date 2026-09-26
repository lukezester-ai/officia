'use server';

import { and, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireTenant } from '@/lib/auth/get-tenant';
import { getAppBaseUrl } from '@/lib/config/app-url';
import {
  createRequisition,
  getAccountBalances,
  getAccountDetails,
  getBookedTransactions,
  getRequisition,
  listBgInstitutions,
  openBankingConfigured,
} from '@/lib/banking/gocardless';
import { mapBookedTransaction, pickBalance } from '@/lib/banking/gocardless-map';
import { db } from '@/lib/db/db';
import { bankAccounts } from '@/lib/db/schema/bank_accounts';
import { bankLinks } from '@/lib/db/schema/bank_links';
import { bankTransactions } from '@/lib/db/schema/bank_transactions';

function returnOrigin() {
  try {
    return getAppBaseUrl();
  } catch {
    if (process.env.NODE_ENV !== 'production') return 'http://localhost:3000';
    return '';
  }
}

async function importExternalAccount(input: {
  tenantId: string;
  externalAccountId: string;
  requisitionId: string;
  institutionId: string;
  institutionName: string;
}) {
  const details = await getAccountDetails(input.externalAccountId);
  const balances = await getAccountBalances(input.externalAccountId);
  const booked = await getBookedTransactions(input.externalAccountId);
  const balance = pickBalance(balances);
  const mapped = booked.map(mapBookedTransaction).filter((row) => row !== null);

  const [existing] = await db.select({ id: bankAccounts.id }).from(bankAccounts).where(and(
    eq(bankAccounts.tenantId, input.tenantId),
    eq(bankAccounts.externalAccountId, input.externalAccountId),
  )).limit(1);

  let accountId = existing?.id;
  if (!accountId) {
    const [created] = await db.insert(bankAccounts).values({
      tenantId: input.tenantId,
      institutionId: input.institutionId,
      institutionName: input.institutionName || details.name || 'Банка',
      externalAccountId: input.externalAccountId,
      requisitionId: input.requisitionId,
      iban: details.iban || null,
      balance: balance?.amount || '0.00',
      currency: balance?.currency || details.currency || 'EUR',
    }).returning({ id: bankAccounts.id });
    accountId = created.id;
  } else if (balance) {
    await db.update(bankAccounts).set({
      balance: balance.amount,
      currency: balance.currency,
      iban: details.iban || undefined,
      requisitionId: input.requisitionId,
    }).where(eq(bankAccounts.id, accountId));
  }

  if (mapped.length === 0) return { accountId, inserted: 0 };

  const ids = mapped.map((row) => row.transactionId);
  const already = await db.select({ transactionId: bankTransactions.transactionId })
    .from(bankTransactions)
    .where(inArray(bankTransactions.transactionId, ids));
  const seen = new Set(already.map((row) => row.transactionId));
  const fresh = mapped.filter((row) => !seen.has(row.transactionId));
  if (fresh.length > 0) {
    await db.insert(bankTransactions).values(fresh.map((row) => ({
      accountId,
      transactionId: row.transactionId,
      amount: row.amount,
      currency: row.currency,
      date: row.date,
      description: row.description,
      counterpartyName: row.counterpartyName,
      counterpartyIban: row.counterpartyIban,
      isReconciled: false,
    })));
  }
  return { accountId, inserted: fresh.length };
}

export async function listOpenBankingInstitutions() {
  if (!openBankingConfigured()) {
    return {
      success: false as const,
      configured: false,
      error: 'Живата връзка иска NORDIGEN_SECRET_ID и NORDIGEN_SECRET_KEY. Без тях движенията влизат със CSV.',
      data: [],
    };
  }
  try {
    await requireTenant();
    const data = await listBgInstitutions();
    return { success: true as const, configured: true, data, error: '' };
  } catch (error: any) {
    return { success: false as const, configured: true, error: error.message || 'Списъкът с банки не се зареди.', data: [] };
  }
}

export async function startOpenBanking(lang: string, institutionId: string, institutionName: string) {
  try {
    if (!openBankingConfigured()) {
      return { success: false, error: 'Липсват ключовете за GoCardless.' };
    }
    if (!/^[a-z]{2}$/.test(lang)) return { success: false, error: 'Непознат език на адреса.' };
    if (!institutionId.trim()) return { success: false, error: 'Изберете банка.' };

    const { tenantId } = await requireTenant();
    const origin = returnOrigin();
    if (!origin) return { success: false, error: 'Липсва NEXT_PUBLIC_APP_URL.' };

    const reference = crypto.randomUUID();
    const redirect = `${origin}/${lang}/dashboard/banking/connected?ref=${reference}`;
    const requisition = await createRequisition({
      institutionId: institutionId.trim(),
      redirect,
      reference,
    });

    await db.insert(bankLinks).values({
      tenantId,
      reference,
      requisitionId: requisition.id,
      institutionId: institutionId.trim(),
      institutionName: institutionName.trim() || institutionId.trim(),
      status: 'pending',
    });

    return { success: true, link: requisition.link };
  } catch (error: any) {
    return { success: false, error: error.message || 'Връзката към банката не тръгна.' };
  }
}

export async function completeOpenBanking(reference: string) {
  try {
    const { tenantId } = await requireTenant();
    const ref = reference.trim();
    if (!ref) return { success: false, error: 'Липсва код на връзката.', count: 0, accounts: 0 };

    const [link] = await db.select().from(bankLinks).where(and(
      eq(bankLinks.tenantId, tenantId),
      eq(bankLinks.reference, ref),
    )).limit(1);
    if (!link) return { success: false, error: 'Тази банкова връзка не е за текущия клиент.', count: 0, accounts: 0 };

    const requisition = await getRequisition(link.requisitionId);
    if (requisition.status !== 'LN') {
      const failed = requisition.status === 'RJ' || requisition.status === 'EX';
      if (failed) {
        await db.update(bankLinks).set({ status: 'failed' }).where(eq(bankLinks.id, link.id));
      }
      return {
        success: false,
        error: failed ? 'Банката отказа достъпа.' : 'Банката още не е потвърдила достъпа. Завършете входа и се върнете.',
        count: 0,
        accounts: 0,
      };
    }

    let inserted = 0;
    for (const externalAccountId of requisition.accounts) {
      const result = await importExternalAccount({
        tenantId,
        externalAccountId,
        requisitionId: link.requisitionId,
        institutionId: link.institutionId,
        institutionName: link.institutionName || '',
      });
      inserted += result.inserted;
    }

    await db.update(bankLinks).set({ status: 'linked' }).where(eq(bankLinks.id, link.id));
    revalidatePath('/', 'layout');
    return { success: true, error: '', count: inserted, accounts: requisition.accounts.length };
  } catch (error: any) {
    return { success: false, error: error.message || 'Движенията не влязоха.', count: 0, accounts: 0 };
  }
}

export async function syncOpenBanking() {
  try {
    if (!openBankingConfigured()) {
      return { success: false, error: 'Отвореното банкиране не е настроено.', count: 0 };
    }
    const { tenantId } = await requireTenant();
    const accounts = await db.select().from(bankAccounts).where(eq(bankAccounts.tenantId, tenantId));
    const linked = accounts.filter((account) => account.externalAccountId);
    if (linked.length === 0) return { success: false, error: 'Няма сметка, свързана с банка.', count: 0 };

    let inserted = 0;
    for (const account of linked) {
      const result = await importExternalAccount({
        tenantId,
        externalAccountId: account.externalAccountId!,
        requisitionId: account.requisitionId || '',
        institutionId: account.institutionId || '',
        institutionName: account.institutionName || '',
      });
      inserted += result.inserted;
    }
    revalidatePath('/', 'layout');
    return { success: true, error: '', count: inserted };
  } catch (error: any) {
    return { success: false, error: error.message || 'Обновяването не мина.', count: 0 };
  }
}
