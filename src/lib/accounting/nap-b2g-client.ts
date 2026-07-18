// @ts-nocheck
/**
 * NAP B2G (Business-to-Government) API Client Simulation.
 * Handles the direct submission of signed XML documents to the Bulgarian Tax Agency.
 */

export interface NapSubmissionResult {
  success: boolean;
  napReceiptNumber?: string; // Входящ номер (e.g. 1234567890)
  submissionDate?: string;
  error?: string;
  statusCode?: number;
}

export class NapB2GClient {
  private isSimulation: boolean;

  constructor() {
    this.isSimulation = !process.env.NAP_B2G_PRODUCTION_URL;
  }

  /**
   * Submits a KEP-signed XML document (e.g. VAT Declaration) to NAP.
   * Requires the company EIK and the Base64 representation of the signed XML.
   */
  async submitVatDeclaration(eik: string, signedXmlBase64: string): Promise<NapSubmissionResult> {
    if (this.isSimulation) {
      console.log(`[NAP B2G SIM] Submitting VAT Declaration for EIK ${eik}...`);
      
      // Simulate network delay to NAP servers (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate success response with a valid receipt number
      const mockReceiptNumber = `NAP-${new Date().getFullYear()}-${Math.floor(10000000 + Math.random() * 90000000)}`;
      
      console.log(`[NAP B2G SIM] Success! Receipt Number: ${mockReceiptNumber}`);

      return {
        success: true,
        napReceiptNumber: mockReceiptNumber,
        submissionDate: new Date().toISOString(),
        statusCode: 200
      };
    }

    // Real production API call would construct MTOM/SOAP or REST payload depending on NAP spec
    throw new Error('Real NAP B2G integration not implemented yet.');
  }

  /**
   * Checks the processing status of an already submitted document by receipt number.
   */
  async checkSubmissionStatus(receiptNumber: string): Promise<{ status: 'processing' | 'accepted' | 'rejected', message?: string }> {
    if (this.isSimulation) {
      return { status: 'accepted', message: 'Декларацията е приета успешно.' };
    }
    throw new Error('Real NAP B2G integration not implemented yet.');
  }
}

export const napB2GClient = new NapB2GClient();
