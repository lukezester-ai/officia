// @ts-nocheck
/**
 * Evrotrust / B-Trust Cloud KEP (Квалифициран Електронен Подпис) Simulation Adapter.
 * This client simulates sending an XML document to a mobile device for remote signing.
 */

export interface SignatureStatusResponse {
  status: 'pending' | 'signed' | 'rejected' | 'timeout';
  signedDocumentBase64?: string;
  signatureId?: string;
}

export class CloudKEPClient {
  private apiKey: string;
  private isSimulation: boolean;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.EVROTRUST_API_KEY || 'sim-mode';
    this.isSimulation = !process.env.EVROTRUST_API_KEY;
  }

  /**
   * Simulates sending a document (e.g. VAT XML) to the user's smartphone for confirmation.
   * Returns a transaction ID used for polling the status.
   */
  async sendDocumentForSignature(documentBase64: string, userPhone: string, documentName: string): Promise<{ transactionId: string; success: boolean }> {
    if (this.isSimulation) {
      console.log(`[Cloud KEP SIM] Sent document '${documentName}' to phone ${userPhone} for signature.`);
      // Return a mock transaction ID
      return { transactionId: `txn_${Date.now()}_sim`, success: true };
    }

    // Real production API call would go here
    throw new Error('Real Evrotrust integration not implemented yet. Set EVROTRUST_API_KEY to blank to use simulation mode.');
  }

  /**
   * Simulates polling the status of the signature. 
   * In a real world scenario, this is either polled by the frontend/backend or triggered via Webhook.
   * For the MVP demo, we will simulate it takes 2-3 seconds to sign, and then return "signed".
   */
  async checkSignatureStatus(transactionId: string): Promise<SignatureStatusResponse> {
    if (this.isSimulation) {
      // For simulation, we pretend the user instantly signed it if we call this endpoint.
      console.log(`[Cloud KEP SIM] Checking status for txn ${transactionId}... user signed it.`);
      
      // We generate a dummy signed XML wrapper
      const dummySignedXml = `<?xml version="1.0" encoding="UTF-8"?>
<SignedDocument>
  <OriginalContent>...base64_hidden...</OriginalContent>
  <Signature>
    <Signer>Officia Manager EGN 1234567890</Signer>
    <CertIssuer>Evrotrust QTSP</CertIssuer>
    <Timestamp>${new Date().toISOString()}</Timestamp>
  </Signature>
</SignedDocument>`;

      return {
        status: 'signed',
        signedDocumentBase64: Buffer.from(dummySignedXml).toString('base64'),
        signatureId: `sig_${Date.now()}`
      };
    }

    throw new Error('Real Evrotrust integration not implemented yet.');
  }
}

export const cloudKepClient = new CloudKEPClient();
