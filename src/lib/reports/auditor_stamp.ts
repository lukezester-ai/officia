import crypto from 'crypto';

export async function applyAuditorStamp(fileBuffer: Buffer, reportMetadata: Record<string, unknown> = {}) {
  const key = process.env.AUDIT_STAMP_SECRET;
  if (!key) {
    throw new Error('Липсва AUDIT_STAMP_SECRET за одиторски печат.');
  }

  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  const timestamp = new Date().toISOString();
  const payload = JSON.stringify({
    hash,
    timestamp,
    metadata: reportMetadata ?? {},
  });
  const signature = crypto.createHmac('sha256', key).update(payload).digest('base64');

  return {
    fileBuffer,
    stamp: {
      hash,
      timestamp,
      signature,
      issuer: 'Officia ERP Audit Authority',
    },
  };
}
