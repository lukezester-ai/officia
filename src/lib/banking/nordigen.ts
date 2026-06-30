const BASE_URL = 'https://bankaccountdata.gocardless.com/api/v2';

export function isNordigenConfigured(): boolean {
  return Boolean(process.env.NORDIGEN_SECRET_ID && process.env.NORDIGEN_SECRET_KEY);
}

async function getAccessToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/token/new/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      secret_id: process.env.NORDIGEN_SECRET_ID,
      secret_key: process.env.NORDIGEN_SECRET_KEY,
    }),
  });

  if (!res.ok) {
    throw new Error(`Nordigen auth failed: ${res.status}`);
  }

  const data = await res.json();
  return data.access as string;
}

export async function createBankRequisition(params: {
  institutionId: string;
  redirectUrl: string;
  reference: string;
}) {
  const token = await getAccessToken();
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

export async function getRequisition(requisitionId: string) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}/requisitions/${requisitionId}/`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to load requisition');
  return res.json() as Promise<{ id: string; accounts: string[]; status: string }>;
}

export async function getAccountDetails(accountId: string) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}/accounts/${accountId}/details/`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to load account details');
  return res.json() as Promise<{ account: { iban?: string; name?: string; currency?: string } }>;
}

export async function getAccountTransactions(accountId: string) {
  const token = await getAccessToken();
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
