import { generateUblXml, UblInvoiceData } from './ubl-generator';

interface NAPConfig {
  environment: 'test' | 'production';
  endpoint: string;
}

const configs: Record<'test' | 'production', NAPConfig> = {
  test: {
    environment: 'test',
    endpoint: 'https://ei-test.nap.bg/EPEP/InvoiceRegistration',
  },
  production: {
    environment: 'production',
    endpoint: 'https://ei.nap.bg/EPEP/InvoiceRegistration',
  }
};

export interface NAPSendResponse {
  success: boolean;
  napRegistrationId?: string;
  error?: string;
}

/**
 * Изпраща фактура към НАП чрез e-Invoicing B2B/B2G портала.
 * В реална среда тази функция изисква подписване на XML-а с КЕП (XAdES).
 * Тъй като това е симулация, ние генерираме XML-а и симулираме мрежовия отговор.
 */
export async function sendInvoiceToNAP(
  invoiceData: UblInvoiceData,
  environment: 'test' | 'production',
  napApiKey?: string // В реална среда би било ПИН на сертификат или API Token
): Promise<NAPSendResponse> {
  const config = configs[environment];
  
  // 1. Генериране на UBL 2.1 XML
  const invoiceXml = generateUblXml(invoiceData);
  
  // 2. Подписване на XML (симулация)
  const signedXml = await signXmlWithCertificate(invoiceXml, napApiKey);
  
  // 3. Изграждане на SOAP заявка (НАП изисква SOAP)
  const soapEnvelope = buildSoapEnvelope(signedXml);
  
  // 4. Изпращане (симулация)
  const response = await sendSoapRequest(config.endpoint, soapEnvelope);
  
  // 5. Парсване на отговора
  return parseNAPResponse(response);
}

async function signXmlWithCertificate(xml: string, apiKey?: string): Promise<string> {
  // Използваме библиотека като 'xml-crypto' или 'xadesjs'
  // Това е сложна операция - изисква XAdES подпис (стандарт на ETSI)
  // Тук връщаме оригиналния XML за целите на демонстрацията
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
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// Mock of sending soap request
async function sendSoapRequest(endpoint: string, envelope: string): Promise<string> {
    return "<response>success</response>";
}

// Mock of parsing NAP response
function parseNAPResponse(response: string): NAPSendResponse {
    return { success: true, napRegistrationId: 'MOCK_NAP_ID_123' };
}
