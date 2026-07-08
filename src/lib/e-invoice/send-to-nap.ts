import * as https from 'https';
import * as fs from 'fs';
import * as crypto from 'crypto';

interface NAPConfig {
  environment: 'test' | 'production';
  endpoint: string;
  certificatePath: string;
  keyPath: string;
  caPath?: string;
}

const configs: Record<'test' | 'production', NAPConfig> = {
  test: {
    environment: 'test',
    endpoint: 'https://ei-test.nap.bg/EPEP/InvoiceRegistration',
    certificatePath: process.env.NAP_TEST_CERT_PATH || './certs/nap-test.pem',
    keyPath: process.env.NAP_TEST_KEY_PATH || './certs/nap-test-key.pem',
    caPath: process.env.NAP_TEST_CA_PATH,
  },
  production: {
    environment: 'production',
    endpoint: 'https://ei.nap.bg/EPEP/InvoiceRegistration',
    certificatePath: process.env.NAP_PROD_CERT_PATH || './certs/nap-prod.pem',
    keyPath: process.env.NAP_PROD_KEY_PATH || './certs/nap-prod-key.pem',
    caPath: process.env.NAP_PROD_CA_PATH,
  },
};

export interface NAPSendResponse {
  success: boolean;
  napRegistrationId?: string;
  error?: string;
  mode?: 'live' | 'mock' | 'disabled';
}

export function isNapConfigured(environment: 'test' | 'production'): boolean {
  if (process.env.NAP_ENABLED !== 'true') return false;
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
      error: 'NAP e-invoice is not configured. Set NAP_ENABLED=true and provide certificate paths.',
    };
  }

  if (process.env.NAP_MOCK_MODE === 'true') {
    return { success: true, mode: 'mock', napRegistrationId: `MOCK_NAP_${Date.now()}` };
  }

  try {
    const config = configs[environment];
    const signedXml = await signXmlWithCertificate(invoiceXml, config.certificatePath, config.keyPath);
    const soapEnvelope = buildSoapEnvelope(signedXml);
    const response = await sendSoapRequest(config, soapEnvelope);
    return { ...parseNAPResponse(response), mode: 'live' };
  } catch (error: any) {
    return { success: false, mode: 'live', error: error.message || 'NAP submission failed' };
  }
}

async function signXmlWithCertificate(xml: string, certPath: string, keyPath: string): Promise<string> {
  const cert = fs.readFileSync(certPath, 'utf8');
  const key = fs.readFileSync(keyPath, 'utf8');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(xml);
  sign.end();
  const signature = sign.sign(key, 'base64');

  const signatureInsert = `
  <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
    <SignedInfo>
      <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      <SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
      <Reference URI="">
        <Transforms>
          <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
        </Transforms>
        <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
        <DigestValue>${crypto.createHash('sha256').update(xml).digest('base64')}</DigestValue>
      </Reference>
    </SignedInfo>
    <SignatureValue>${signature}</SignatureValue>
    <KeyInfo>
      <X509Data>
        <X509Certificate>${cert.replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').replace(/\n/g, '')}</X509Certificate>
      </X509Data>
    </KeyInfo>
  </Signature>`;

  return xml.replace('</Invoice>', `${signatureInsert}\n</Invoice>`);
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
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

async function sendSoapRequest(config: NAPConfig, envelope: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = new URL(config.endpoint);
    const req = https.request(
      {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        cert: fs.readFileSync(config.certificatePath),
        key: fs.readFileSync(config.keyPath),
        ca: config.caPath ? fs.readFileSync(config.caPath) : undefined,
        rejectUnauthorized: process.env.NAP_REJECT_UNAUTHORIZED !== 'false',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'http://nap.bg/schemas/eInvoice/RegisterInvoice',
          'Content-Length': Buffer.byteLength(envelope, 'utf8'),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(Buffer.from(c)));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      },
    );
    req.on('error', reject);
    req.write(envelope, 'utf8');
    req.end();
  });
}

function parseNAPResponse(response: string): Omit<NAPSendResponse, 'mode'> {
  const idMatch = response.match(/<napRegistrationId[^>]*>([^<]+)<\/napRegistrationId>/i);
  const statusMatch = response.match(/<status[^>]*>([^<]+)<\/status>/i);
  const accepted = response.includes('ACCEPTED') || response.includes('REGISTERED');
  const errorMatch = response.match(/<error[^>]*>([^<]+)<\/error>/i);

  if (accepted || statusMatch?.[1] === 'ACCEPTED' || statusMatch?.[1] === 'REGISTERED') {
    return { success: true, napRegistrationId: idMatch?.[1] || `NAP_${crypto.randomUUID()}` };
  }

  return { success: false, error: errorMatch?.[1] || 'NAP rejected the invoice' };
}
