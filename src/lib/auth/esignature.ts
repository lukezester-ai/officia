// @ts-nocheck
export interface SigningResult {
  success: boolean;
  transactionId?: string;
  status?: string;
}

export async function signDocumentWithEvrotrust(
  documentId: string,
  userId: string,
  phoneNumber: string
): Promise<SigningResult> {
  // 1. Изпращане на заявка за подпис към Evrotrust
  const response = await fetch('https://api.evrotrust.com/v1/sign', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.EVROTRUST_API_KEY}` },
    body: JSON.stringify({
      documentId,
      userId,
      phoneNumber,
      callbackUrl: `${process.env.APP_URL}/api/signing-callback`,
    }),
  });
  
  // 2. Потребителят получава известие на телефона си (Evrotrust app)
  // 3. След потвърждение, Evrotrust извиква callback с подписания документ
  // 4. Запазваме подписания PDF и метаданните за подписа
  
  return response.json();
}
