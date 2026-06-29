import { tool } from 'ai';
import { z } from 'zod';

async function checkViesVat(countryCode: string, vatNumber: string) {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
  <soapenv:Body>
    <urn:checkVat>
      <urn:countryCode>${countryCode}</urn:countryCode>
      <urn:vatNumber>${vatNumber}</urn:vatNumber>
    </urn:checkVat>
  </soapenv:Body>
</soapenv:Envelope>`;

  const response = await fetch('https://ec.europa.eu/taxation_customs/vies/checkVatService', {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml;charset=UTF-8', SOAPAction: '' },
    body,
    signal: AbortSignal.timeout(8000),
  });

  const text = await response.text();
  const valid = /<valid>\s*true\s*<\/valid>/i.test(text);
  const nameMatch = text.match(/<name>(.*?)<\/name>/);
  const addressMatch = text.match(/<address>(.*?)<\/address>/);

  return {
    valid,
    name: nameMatch?.[1]?.replace(/&amp;/g, '&') ?? null,
    address: addressMatch?.[1]?.replace(/&amp;/g, '&') ?? null,
    source: 'VIES',
  };
}

export function buildCheckNraStatusTool() {
  return tool({
    description: 'Проверява фирма по ЕИК / ДДС номер чрез EU VIES (за BG VAT) или връща структуриран advisory отговор.',
    inputSchema: z.object({
      eik: z.string().describe('ЕИК (Булстат) или VAT номер (напр. 206123456 или BG206123456).'),
    }),
    execute: async ({ eik }) => {
      const normalized = eik.replace(/\s+/g, '').toUpperCase();
      const viesMatch = normalized.match(/^BG?(\d{9,10})$/);

      if (viesMatch) {
        const vatNumber = viesMatch[1];
        try {
          const vies = await checkViesVat('BG', vatNumber);
          return {
            success: true,
            data: {
              eik: vatNumber,
              companyName: vies.name,
              address: vies.address,
              status: vies.valid ? 'Активен по VIES' : 'Не е намерен в VIES',
              vatRegistered: vies.valid,
              vatNumber: vies.valid ? `BG${vatNumber}` : null,
              lastChecked: new Date().toISOString(),
              source: vies.source,
            },
            message: vies.valid
              ? `VAT номер BG${vatNumber} е валиден според EU VIES.`
              : `VAT номер BG${vatNumber} не е намерен в EU VIES.`,
          };
        } catch (error: any) {
          return {
            success: false,
            error: `VIES lookup failed: ${error.message}`,
          };
        }
      }

      return {
        success: true,
        data: {
          eik: normalized,
          companyName: null,
          address: null,
          status: 'Изисква ръчна проверка',
          vatRegistered: null,
          vatNumber: null,
          lastChecked: new Date().toISOString(),
          source: 'advisory',
        },
        message:
          'За пълна справка от Търговски регистър/НАП е нужна интеграция с официален API. За ДДС номера използвай формат BG123456789.',
      };
    },
  });
}
