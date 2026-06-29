import * as crypto from 'crypto';
import * as fs from 'fs';

interface NAPConfig {
  environment: 'test' | 'production';
  endpoint: string;
  certificatePath: string;
  keyPath: string;
  keystorePassword?: string;
}

const configs: Record<'test' | 'production', NAPConfig> = {
  test: {
    environment: 'test',
    endpoint: 'https://ei-test.nap.bg/EPEP/InvoiceRegistration',
    certificatePath: process.env.NAP_TEST_CERT_PATH || './certs/test-cert.p12',
    keyPath: process.env.NAP_TEST_KEY_PATH || './certs/test-key.pem',
  },
  production: {
    environment: 'production',
    endpoint: 'https://ei.nap.bg/EPEP/InvoiceRegistration',
    certificatePath: process.env.NAP_PROD_CERT_PATH || './certs/prod-cert.p12',
    keyPath: process.env.NAP_PROD_KEY_PATH || './certs/prod-key.pem',
  },
};

export interface NAPSendResponse {
  success: boolean;
  napRegistrationId?: string;
  error?: string;
  mode?: 'live' | 'mock' | 'disabled';
}

export function isNapConfigured(environment: 'test' | 'production'): boolean {
  if (process.env.NAP_ENABLED !== 'true') {
    return false;
  }

  const config = configs[environment];
  return fs.existsSync(config.certificatePath) && fs.existsSync(config.keyPath);
}

export async function sendInvoiceToNAP(
  invoiceXml: string,
  environment: 'test' | 'production' = 'test',
): Promise<NAPSendResponse> {
  if (!isNapConfigured(environment)) {
    return {
      success: false,
      mode: 'disabled',
      error:
        'NAP e-invoice is not configured. Set NAP_ENABLED=true and provide certificate paths (NAP_TEST_CERT_PATH, NAP_TEST_KEY_PATH).',
    };
  }

  if (process.env.NAP_MOCK_MODE === 'true') {
    return {
      success: true,
      mode: 'mock',
      napRegistrationId: `MOCK_NAP_${Date.now()}`,
    };
  }

  try {
    const config = configs[environment];
    const signedXml = await signXmlWithCertificate(
      invoiceXml,
      config.certificatePath,
      config.keystorePassword,
    );
    const soapEnvelope = buildSoapEnvelope(signedXml);
    const response = await sendSoapRequest(
      config.endpoint,
      soapEnvelope,
      config.certificatePath,
      config.keyPath,
    );
    const parsed = parseNAPResponse(response);
    return { ...parsed, mode: 'live' };
  } catch (error: any) {
    return {
      success: false,
      mode: 'live',
      error: error.message || 'NAP submission failed',
    };
  }
}

async function signXmlWithCertificate(xml: string, certPath: string, password?: string): Promise<string> {
  void certPath;
  void password;
  return xml;
}

function buildSoapEnvelope(xmlContent: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      <soap:Header/>
      <soap:Body>
        <RegisterInvoice xmlns="http://nap.bg/schemas/eInvoice">
          <invoiceData>${escapeXml(xmlContent)}</invoiceData>
        </RegisterInvoice>
      </soap:Body>
    </soap:Envelope>`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

async function sendSoapRequest(
  endpoint: string,
  envelope: string,
  certPath: string,
  keyPath: string,
): Promise<string> {
  void endpoint;
  void envelope;
  void certPath;
  void keyPath;
  throw new Error('Live NAP SOAP transport is not implemented yet. Use NAP_MOCK_MODE=true for staging tests.');
}

function parseNAPResponse(response: string): NAPSendResponse {
  if (response.toLowerCase().includes('success')) {
    return { success: true, napRegistrationId: `NAP_${crypto.randomUUID()}` };
  }

  return { success: false, error: 'Unexpected NAP response format' };
}
