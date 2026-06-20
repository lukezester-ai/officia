import { NextRequest } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
      language: "bg", // Set to Bulgarian
      response_format: "json",
    });

    return Response.json({ text: transcription.text });
  } catch (error: any) {
    console.error("Transcription error:", error);
    return Response.json({ error: "Transcription failed", details: error.message }, { status: 500 });
  }
}
