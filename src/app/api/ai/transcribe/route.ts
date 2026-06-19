import { NextRequest } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key_for_build',
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "bg",           // български
      response_format: "json",
    });

    return Response.json({ text: transcription.text });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Transcription failed" }, { status: 500 });
  }
}
