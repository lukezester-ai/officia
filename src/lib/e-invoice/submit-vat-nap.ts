import * as https from 'https';
import * as fs from 'fs';

export type NapVatSubmitResult = {
  success: boolean;
  mode: 'live' | 'mock' | 'disabled';
  referenceNumber?: string;
  error?: string;
};

export async function submitVatZipToNap(params: {
  zipBuffer: Buffer;
  filename: string;
  year: number;
  month: number;
}): Promise<NapVatSubmitResult> {
  if (process.env.NAP_MOCK_MODE === 'true') {
    return {
      success: true,
      mode: 'mock',
      referenceNumber: `MOCK_VAT_${params.year}${String(params.month).padStart(2, '0')}_${Date.now()}`,
    };
  }

  if (process.env.NAP_ENABLED !== 'true') {
    return {
      success: false,
      mode: 'disabled',
      error: 'NAP_ENABLED is not true. Configure certificates or use NAP_MOCK_MODE=true.',
    };
  }

  const submitUrl =
    process.env.NAP_VAT_SUBMIT_URL ||
    'https://portal.nra.bg/vat/upload';

  const certPath = process.env.NAP_TEST_CERT_PATH || process.env.NAP_PROD_CERT_PATH;
  const keyPath = process.env.NAP_TEST_KEY_PATH || process.env.NAP_PROD_KEY_PATH;

  if (!certPath || !keyPath || !fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    return {
      success: false,
      mode: 'disabled',
      error: 'NAP certificate paths are missing. Set NAP_TEST_CERT_PATH and NAP_TEST_KEY_PATH.',
    };
  }

  try {
    const boundary = `----officia${Date.now()}`;
    const bodyParts = [
      `--${boundary}\r\n`,
      `Content-Disposition: form-data; name="file"; filename="${params.filename}"\r\n`,
      `Content-Type: application/zip\r\n\r\n`,
    ];
    const bodyEnd = `\r\n--${boundary}--\r\n`;
    const body = Buffer.concat([
      Buffer.from(bodyParts.join('')),
      params.zipBuffer,
      Buffer.from(bodyEnd),
    ]);

    const responseBody = await new Promise<string>((resolve, reject) => {
      const req = https.request(
        submitUrl,
        {
          method: 'POST',
          cert: fs.readFileSync(certPath),
          key: fs.readFileSync(keyPath),
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length,
          },
          rejectUnauthorized: process.env.NAP_REJECT_UNAUTHORIZED !== 'false',
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(Buffer.from(c)));
          res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        },
      );
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    const refMatch = responseBody.match(/reference[^A-Za-z0-9]*([A-Z0-9-]{6,})/i);
    return {
      success: true,
      mode: 'live',
      referenceNumber: refMatch?.[1] || `NAP_${params.year}${String(params.month).padStart(2, '0')}_${Date.now()}`,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'NAP upload failed';
    return { success: false, mode: 'live', error: message };
  }
}
