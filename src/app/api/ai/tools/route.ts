import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { aiAutomationRegistry } from '@/lib/ai/automation/registry';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(aiAutomationRegistry);
  } catch (error) {
    console.error('Error fetching AI automation registry:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
