import { NextRequest, NextResponse } from "next/server";
import { getRelevantMemories, writeMemory, type MemoryType } from "@/lib/ai/memory";
import { requireTenant } from "@/lib/auth/get-tenant";

const MEMORY_TYPES = new Set<MemoryType>(["preference", "fact", "history"]);

async function tenantOrResponse() {
  try {
    const { tenantId } = await requireTenant();
    return { tenantId, response: null as NextResponse | null };
  } catch {
    return {
      tenantId: null,
      response: NextResponse.json({ error: "Неоторизиран достъп" }, { status: 401 }),
    };
  }
}

function sameTenant(requested: string | null, tenantId: string) {
  return !requested || requested === tenantId;
}

export async function GET(req: NextRequest) {
  try {
    const { tenantId, response } = await tenantOrResponse();
    if (response || !tenantId) return response;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim();
    const requestedClient = searchParams.get("clientId");
    const topK = Math.min(20, Math.max(1, parseInt(searchParams.get("topK") ?? "5", 10) || 5));

    if (!query) {
      return NextResponse.json({ error: "query е задължително" }, { status: 400 });
    }
    if (!sameTenant(requestedClient, tenantId)) {
      return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 403 });
    }

    const memories = await getRelevantMemories(tenantId, query, topK);
    return NextResponse.json({ memories });
  } catch (err) {
    console.error("[Memory GET]", err);
    return NextResponse.json({ error: "Спомените не бяха заредени" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId, response } = await tenantOrResponse();
    if (response || !tenantId) return response;

    const body = await req.json();
    const content = String(body?.content ?? "").trim();
    const memoryType = body?.memoryType as MemoryType;
    const requestedClient = typeof body?.clientId === "string" ? body.clientId : null;

    if (!content || !MEMORY_TYPES.has(memoryType)) {
      return NextResponse.json(
        { error: "content и валиден memoryType са задължителни" },
        { status: 400 },
      );
    }
    if (!sameTenant(requestedClient, tenantId)) {
      return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 403 });
    }

    const id = await writeMemory({
      clientId: tenantId,
      content,
      memoryType,
      metadata: body?.metadata && typeof body.metadata === "object" ? body.metadata : {},
    });
    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (err) {
    console.error("[Memory POST]", err);
    return NextResponse.json({ error: "Споменът не беше записан" }, { status: 500 });
  }
}
