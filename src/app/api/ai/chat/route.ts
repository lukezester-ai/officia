import { NextRequest } from 'next/server';
import { runAIAssistant } from '@/lib/ai/assistant';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Since we are using FormData to support attachments
    const formData = await req.formData();
    const message = formData.get('message') as string;
    
    // We could extract files if we want to pass them to an OCR or Vision model later.
    // const files = formData.getAll('files') as File[];

    if (!message) {
      return Response.json({ error: "No message provided" }, { status: 400 });
    }

    // In a real scenario, we would retrieve tenantId from DB.
    const tenantId = "current-tenant-id"; 

    // We can extract history if it was passed. For simplicity, we assume an empty array if not passed.
    const history = [];

    const result = await runAIAssistant(message, tenantId, userId, history);

    return Response.json(result);
  } catch (error: any) {
    console.error("Chat API error:", error);
    return Response.json({ error: "Failed to process chat" }, { status: 500 });
  }
}
