// @ts-nocheck
/**
 * NAP B2G (Business-to-Government) API Client
 * Handles the direct submission of signed XML documents to the Bulgarian Tax Agency.
 */
import { db } from '@/lib/db';
import { napIntegrations } from '@/lib/db/schema/nap-integrations';
import { eq } from 'drizzle-orm';
import { decryptApiKey } from '@/lib/nap/encryption';

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
    this.isSimulation = process.env.ALLOW_INTEGRATION_SIMULATION === 'true';
  }
  
  async getIntegrationKey(organizationId: string): Promise<string | null> {
    const [integration] = await db
      .select()
      .from(napIntegrations)
      .where(eq(napIntegrations.organizationId, organizationId))
      .limit(1);
      
    if (!integration || integration.status !== 'active') return null;
    
    try {
      return decryptApiKey(integration.encryptedApiKey, integration.encryptionIv);
    } catch (e) {
      console.error("Failed to decrypt NAP API key", e);
      return null;
    }
  }

  /**
   * Submits a KEP-signed XML document (e.g. VAT Declaration) to NAP.
   */
  async submitVatDeclaration(organizationId: string, eik: string, signedXmlBase64: string): Promise<NapSubmissionResult> {
    const apiKey = await this.getIntegrationKey(organizationId);
    
    if (!apiKey) {
      return { success: false, error: 'Липсва или невалидна НАП интеграция за тази организация.' };
    }

    if (this.isSimulation) {
      console.log(`[NAP B2G SIM] Submitting VAT Declaration for EIK ${eik} using decrypted key...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockReceiptNumber = `NAP-${new Date().getFullYear()}-${Math.floor(10000000 + Math.random() * 90000000)}`;
      return {
        success: true,
        napReceiptNumber: mockReceiptNumber,
        submissionDate: new Date().toISOString(),
        statusCode: 200
      };
    }

    if (!process.env.NAP_B2G_PRODUCTION_URL) {
      return { success: false, error: 'Реалната НАП B2G интеграция не е конфигурирана.' };
    }

    // Real production API call would construct MTOM/SOAP or REST payload depending on NAP spec
    // using the decrypted apiKey as Authorization header or signing key
    throw new Error('Real NAP B2G integration not implemented yet.');
  }

  /**
   * Checks the processing status of an already submitted document by receipt number.
   */
  async checkSubmissionStatus(organizationId: string, receiptNumber: string): Promise<{ status: 'processing' | 'accepted' | 'rejected', message?: string }> {
    const apiKey = await this.getIntegrationKey(organizationId);
    if (!apiKey) throw new Error('NAP integration required.');
    
    if (this.isSimulation) {
      return { status: 'accepted', message: 'Декларацията е приета успешно.' };
    }
    if (!process.env.NAP_B2G_PRODUCTION_URL) {
      throw new Error('Реалната НАП B2G интеграция не е конфигурирана.');
    }
    throw new Error('Real NAP B2G integration not implemented yet.');
  }
}

export const napB2GClient = new NapB2GClient();
