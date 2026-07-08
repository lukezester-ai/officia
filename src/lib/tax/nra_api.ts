const NAP_API_BASE = process.env.NAP_API_URL || 'https://api.nra.bg';
const NAP_API_TOKEN = process.env.NAP_API_TOKEN;

export type NapInvoiceStatus = 'RECEIVED' | 'ACCEPTED' | 'REJECTED' | 'PENDING';

export interface NapSubmitResult {
  success: boolean;
  referenceId?: string;
  status?: NapInvoiceStatus;
  error?: string;
  mode: 'live' | 'mock' | 'disabled';
}

export interface NapStatusResult {
  success: boolean;
  referenceId?: string;
  status?: NapInvoiceStatus;
  nraMessage?: string;
  error?: string;
  mode: 'live' | 'mock' | 'disabled';
}

function isConfigured(): boolean {
  return process.env.NAP_ENABLED === 'true' && !!NAP_API_TOKEN;
}

function napHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/xml; charset=utf-8',
    Authorization: `Bearer ${NAP_API_TOKEN}`,
    Accept: 'application/json',
  };
}

export async function submitInvoiceToNRA(signedXml: string): Promise<NapSubmitResult> {
  if (process.env.NAP_MOCK_MODE === 'true') {
    return { success: true, referenceId: `MOCK-NRA-${Date.now()}`, status: 'RECEIVED', mode: 'mock' };
  }

  if (!isConfigured()) {
    return { success: false, mode: 'disabled', error: 'NAP_API_TOKEN not configured. Set NAP_ENABLED=true and NAP_API_TOKEN.' };
  }

  try {
    const response = await fetch(`${NAP_API_BASE}/e-invoice/submit`, {
      method: 'POST',
      headers: napHeaders(),
      body: signedXml,
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, mode: 'live', error: `NAP HTTP ${response.status}: ${text}` };
    }

    const data = await response.json();
    return {
      success: true,
      referenceId: data.referenceId || `NRA-${Date.now()}`,
      status: data.status || 'RECEIVED',
      mode: 'live',
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'NAP API call failed';
    return { success: false, mode: 'live', error: message };
  }
}

export async function checkInvoiceStatus(referenceId: string): Promise<NapStatusResult> {
  if (process.env.NAP_MOCK_MODE === 'true') {
    return {
      success: true,
      referenceId,
      status: 'ACCEPTED',
      nraMessage: 'Mock: фактурата е валидирана и приета.',
      mode: 'mock',
    };
  }

  if (!isConfigured()) {
    return { success: false, mode: 'disabled', error: 'NAP_API_TOKEN not configured.' };
  }

  try {
    const response = await fetch(`${NAP_API_BASE}/e-invoice/status/${referenceId}`, {
      headers: napHeaders(),
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, mode: 'live', error: `NAP HTTP ${response.status}: ${text}` };
    }

    const data = await response.json();
    return {
      success: true,
      referenceId,
      status: data.status || 'PENDING',
      nraMessage: data.message,
      mode: 'live',
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'NAP status check failed';
    return { success: false, mode: 'live', error: message };
  }
}
