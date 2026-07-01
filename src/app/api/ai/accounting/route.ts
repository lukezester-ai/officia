import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { AccountingAnalyzer } from '@/ai/accounting-analyzer';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return new NextResponse('Липсващ или невалиден текст', { status: 400 });
    }

    const analysis = await AccountingAnalyzer.analyzeText(text);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error in Accounting AI endpoint:', error);
    return new NextResponse('Вътрешна грешка на сървъра', { status: 500 });
  }
}
