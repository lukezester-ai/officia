import { NextResponse } from 'next/server';
import { tools } from '@/lib/ai/tools';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Връщаме списък с всички достъпни инструменти
    const availableTools = Object.keys(tools).map((toolKey) => ({
      name: toolKey,
      description: (tools as any)[toolKey].description || '',
    }));

    return NextResponse.json({ tools: availableTools });
  } catch (error) {
    console.error('Error fetching tools:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
