const BASE_URL = 'https://bankaccountdata.gocardless.com/api/v2';

export type NordigenCredentials = {
  secretId: string;
  secretKey: string;
};

function resolveCredentials(tenantCredentials?: NordigenCredentials): NordigenCredentials {
  if (tenantCredentials?.secretId && tenantCredentials?.secretKey) {
    return tenantCredentials;
  }
  if (process.env.NORDIGEN_SECRET_ID && process.env.NORDIGEN_SECRET_KEY) {
    return {
      secretId: process.env.NORDIGEN_SECRET_ID,
      secretKey: process.env.NORDIGEN_SECRET_KEY,
    };
  }
  throw new Error('Nordigen is not configured. Set global NORDIGEN_SECRET_ID/NORDIGEN_SECRET_KEY or configure tenant-level keys.');
}

async function getAccessToken(credentials?: NordigenCredentials): Promise<string> {
  const { secretId, secretKey } = resolveCredentials(credentials);
  const res = await fetch(`${BASE_URL}/token/new/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ secret_id: secretId, secret_key: secretKey }),
  });

  if (!res.ok) {
    throw new Error(`Nordigen auth failed: ${res.status}`);
  }

  const data = await res.json();
  return data.access as string;
}

export function isNordigenConfigured(tenantCredentials?: NordigenCredentials): boolean {
  try {
    resolveCredentials(tenantCredentials);
    return true;
  } catch {
    return false;
  }
}

export async function createBankRequisition(
  params: { institutionId: string; redirectUrl: string; reference: string },
  credentials?: NordigenCredentials,
) {
  const token = await getAccessToken(credentials);
  const res = await fetch(`${BASE_URL}/requisitions/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      redirect: params.redirectUrl,
      institution_id: params.institutionId,
      reference: params.reference,
      user_language: 'BG',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Nordigen requisition failed: ${text}`);
  }

  return res.json() as Promise<{ id: string; link: string }>;
}

export async function getRequisition(requisitionId: string, credentials?: NordigenCredentials) {
  const token = await getAccessToken(credentials);
  const res = await fetch(`${BASE_URL}/requisitions/${requisitionId}/`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to load requisition');
  return res.json() as Promise<{ id: string; accounts: string[]; status: string }>;
}

export async function getAccountDetails(accountId: string, credentials?: NordigenCredentials) {
  const token = await getAccessToken(credentials);
  const res = await fetch(`${BASE_URL}/accounts/${accountId}/details/`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to load account details');
  return res.json() as Promise<{ account: { iban?: string; name?: string; currency?: string } }>;
}

export async function getAccountTransactions(accountId: string, credentials?: NordigenCredentials) {
  const token = await getAccessToken(credentials);
  const res = await fetch(`${BASE_URL}/accounts/${accountId}/transactions/`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to load transactions');
  return res.json() as Promise<{
    transactions: {
      booked?: Array<{
        transactionId?: string;
        bookingDate?: string;
        transactionAmount?: { amount: string; currency?: string };
        remittanceInformationUnstructured?: string;
        debtorName?: string;
        creditorName?: string;
      }>;
    };
  }>;
}

export const BG_INSTITUTIONS: Record<string, string> = {
  unicredit: 'UNCRBGSF',
  dsk: 'STSABGSF',
  kbc: 'KBCBBGSF',
  revolut: 'REVOLT21',
  sandbox: 'SANDBOXFINANCE_SFIN0000',
};
