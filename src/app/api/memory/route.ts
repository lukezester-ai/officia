// src/app/api/memory/route.ts
// GET /api/memory?clientId=...&query=...&topK=5
// POST /api/memory  { clientId, content, memoryType, metadata? }

import { NextRequest, NextResponse } from "next/server";
import { getRelevantMemories, writeMemory } from "@/lib/ai/memory";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const query = searchParams.get("query");
    const topK = parseInt(searchParams.get("topK") ?? "5");

    if (!clientId || !query) {
      return NextResponse.json(
        { error: "clientId и query са задължителни" },
        { status: 400 }
      );
    }

    const mems = await getRelevantMemories(clientId, query, topK);
    return NextResponse.json({ memories: mems });
  } catch (err: any) {
    console.error("[Memory GET]", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { clientId, content, memoryType, metadata } = await req.json();

    if (!clientId || !content || !memoryType) {
      return NextResponse.json(
        { error: "clientId, content и memoryType са задължителни" },
        { status: 400 }
      );
    }

    const id = await writeMemory({ clientId, content, memoryType, metadata });
    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (err: any) {
    console.error("[Memory POST]", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
