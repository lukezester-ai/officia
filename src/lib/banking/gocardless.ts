const BASE = 'https://bankaccountdata.gocardless.com/api/v2';

export interface BankInstitution {
  id: string;
  name: string;
  logo: string;
}

interface TokenCache {
  token: string;
  expiresAt: number;
}

let cached: TokenCache | null = null;

export function openBankingConfigured() {
  return Boolean(process.env.NORDIGEN_SECRET_ID?.trim() && process.env.NORDIGEN_SECRET_KEY?.trim());
}

function credentials() {
  const id = process.env.NORDIGEN_SECRET_ID?.trim();
  const key = process.env.NORDIGEN_SECRET_KEY?.trim();
  if (!id || !key) return null;
  return { id, key };
}

async function readJson(res: Response) {
  return res.json().catch(() => ({}));
}

async function accessToken() {
  const creds = credentials();
  if (!creds) throw new Error('Липсват NORDIGEN_SECRET_ID и NORDIGEN_SECRET_KEY.');
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;

  const res = await fetch(`${BASE}/token/new/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ secret_id: creds.id, secret_key: creds.key }),
  });
  const body = await readJson(res);
  if (!res.ok || typeof body.access !== 'string') {
    throw new Error('GoCardless отказа достъп. Проверете ключовете.');
  }
  const seconds = Number(body.access_expires) || 3600;
  cached = { token: body.access, expiresAt: Date.now() + seconds * 1000 };
  return cached.token;
}

async function api(path: string, init?: RequestInit) {
  const token = await accessToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const body = await readJson(res);
  if (!res.ok) {
    const detail = typeof body.detail === 'string' ? body.detail : '';
    throw new Error(detail || 'Банката не върна данни.');
  }
  return body;
}

export async function listBgInstitutions(): Promise<BankInstitution[]> {
  const rows = await api('/institutions/?country=bg');
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row) => row && typeof row.id === 'string' && typeof row.name === 'string')
    .map((row) => ({
      id: row.id,
      name: row.name,
      logo: typeof row.logo === 'string' ? row.logo : '',
    }));
}

export async function createRequisition(input: { institutionId: string; redirect: string; reference: string }) {
  const agreement = await api('/agreements/enduser/', {
    method: 'POST',
    body: JSON.stringify({
      institution_id: input.institutionId,
      max_historical_days: 90,
      access_valid_for_days: 90,
      access_scope: ['balances', 'details', 'transactions'],
    }),
  });
  if (typeof agreement.id !== 'string') throw new Error('GoCardless не върна съгласие за достъп.');

  const requisition = await api('/requisitions/', {
    method: 'POST',
    body: JSON.stringify({
      redirect: input.redirect,
      institution_id: input.institutionId,
      reference: input.reference,
      agreement: agreement.id,
      user_language: 'BG',
    }),
  });
  if (typeof requisition.id !== 'string' || typeof requisition.link !== 'string') {
    throw new Error('GoCardless не върна връзка към банката.');
  }
  return { id: requisition.id as string, link: requisition.link as string };
}

export async function getRequisition(id: string) {
  const body = await api(`/requisitions/${encodeURIComponent(id)}/`);
  const accounts = Array.isArray(body.accounts) ? body.accounts.filter((item: unknown) => typeof item === 'string') : [];
  return { status: typeof body.status === 'string' ? body.status : '', accounts: accounts as string[] };
}

export async function getAccountDetails(accountId: string) {
  const body = await api(`/accounts/${encodeURIComponent(accountId)}/details/`);
  const account = body.account && typeof body.account === 'object' ? body.account : body;
  return {
    iban: typeof account.iban === 'string' ? account.iban : '',
    currency: typeof account.currency === 'string' ? account.currency : 'EUR',
    name: typeof account.name === 'string' ? account.name : '',
  };
}

export async function getAccountBalances(accountId: string) {
  const body = await api(`/accounts/${encodeURIComponent(accountId)}/balances/`);
  return Array.isArray(body.balances) ? body.balances : [];
}

export async function getBookedTransactions(accountId: string) {
  const body = await api(`/accounts/${encodeURIComponent(accountId)}/transactions/`);
  const booked = body.transactions?.booked;
  return Array.isArray(booked) ? booked : [];
}
