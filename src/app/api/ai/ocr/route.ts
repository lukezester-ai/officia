// @ts-nocheck
import { NextResponse } from 'next/server';
import { processDocumentImage } from '@/lib/ai/agents/ocr';
import { OrchestratorAgent } from '@/ai/orchestrator';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType, documentId, tenantId, userId, runPipeline = true } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    let extractedData;

    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('No ANTHROPIC_API_KEY found, using mock OCR data for demo purposes.');
      await new Promise((resolve) => setTimeout(resolve, 800));
      extractedData = {
        totalAmount: 1450.0,
        currency: 'EUR',
        invoiceNumber: `INV-${Math.floor(10000 + Math.random() * 90000)}`,
        date: new Date().toISOString().split('T')[0],
        counterpartyName: 'ТехМарт България ЕООД',
        extractedText:
          'Закупуване на офис техника - Лаптоп Dell XPS, Мишка Logitech MX Master 3S. Плащане по банков път.',
        lineItems: [
          { description: 'Лаптоп Dell XPS 15', quantity: 1, unitPrice: 1350.0, total: 1350.0, itemType: 'goods' },
          { description: 'Консултация по инсталация', quantity: 1, unitPrice: 100.0, total: 100.0, itemType: 'service' },
        ],
      };
    } else {
      extractedData = await processDocumentImage(imageBase64, mimeType || 'image/jpeg');
    }

    // Cross-agent handoff: OCR → purchase draft → journal approval → bank match
    let pipeline = null;
    if (runPipeline && tenantId) {
      pipeline = await OrchestratorAgent.continueFromOcr({
        tenantId,
        userId,
        documentId,
        ocr: extractedData,
      }).catch((err) => ({ success: false, error: err.message }));
    }

    return NextResponse.json({ ...extractedData, pipeline });
  } catch (error: any) {
    console.error('OCR Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process document' }, { status: 500 });
  }
}

