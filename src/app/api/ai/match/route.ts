// @ts-nocheck
import { NextResponse } from 'next/server';
import { matchTransactionWithAI, Transaction, Candidate } from '@/lib/ai/agents/matcher';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transaction, candidates } = body as { transaction: Transaction, candidates: Candidate[] };

    if (!transaction || !candidates) {
      return NextResponse.json({ error: 'Missing transaction or candidates' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Липсва ANTHROPIC_API_KEY в .env.local' }, { status: 500 });
    }

    const matchResult = await matchTransactionWithAI(transaction, candidates);
    
    return NextResponse.json(matchResult);
  } catch (error: any) {
    console.error('Match Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to match' }, { status: 500 });
  }
}
