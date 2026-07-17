// @ts-nocheck
import { NextResponse } from 'next/server';
import { processDocumentImage } from '@/lib/ai/agents/ocr';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('No ANTHROPIC_API_KEY found, using mock OCR data for demo purposes.');
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      return NextResponse.json({
        totalAmount: 1450.00,
        currency: 'EUR',
        invoiceNumber: `INV-${Math.floor(10000 + Math.random() * 90000)}`,
        date: new Date().toISOString().split('T')[0],
        counterpartyName: 'ТехМарт България ЕООД',
        extractedText: 'Закупуване на офис техника - Лаптоп Dell XPS, Мишка Logitech MX Master 3S. Плащане по банков път.',
        lineItems: [
          { description: 'Лаптоп Dell XPS 15', quantity: 1, unitPrice: 1350.00, total: 1350.00, itemType: 'goods' },
          { description: 'Консултация по инсталация', quantity: 1, unitPrice: 100.00, total: 100.00, itemType: 'service' }
        ]
      });
    }

    const extractedData = await processDocumentImage(imageBase64, mimeType || 'image/jpeg');
    
    return NextResponse.json(extractedData);
  } catch (error: any) {
    console.error('OCR Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process document' }, { status: 500 });
  }
}

