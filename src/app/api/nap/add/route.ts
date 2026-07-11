// src/app/api/nap/add/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { napIntegrations } from "@/lib/db/schema/nap-integrations";
import { encryptApiKey } from "@/lib/nap/encryption";


/**
 * POST /api/nap/add
 * Тялото трябва да съдържа:
 * {
 *   "organizationId": "uuid",
 *   "eik": "string",
 *   "apiKey": "plain‑text‑NAP‑key"
 * }
 *
 * 1. Криптира API‑ключа с AES‑256‑GCM.
 * 2. Записва нов запис в `nap_integrations`.
 * 3. Връща ID‑то на новата интеграция.
 */
export async function POST(req: Request) {
  try {
    const { organizationId, eik, apiKey } = await req.json();

    if (!organizationId || !eik || !apiKey) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1️⃣ Криптираме предоставения API‑ключ
    const { encrypted, iv } = encryptApiKey(apiKey);

    // 2️⃣ Съхраняваме в базата
    const [record] = await db
      .insert(napIntegrations)
      .values({
      id: crypto.randomUUID(),
        organizationId,
        eik,
        encryptedApiKey: encrypted,
        encryptionIv: iv,
        connectedByUserId: "system",
        status: "active",
      })
      .returning();

    return NextResponse.json({ success: true, integrationId: record.id }, { status: 201 });
  } catch (err: any) {
    console.error("[NAP Add] error", err);
    return NextResponse.json(
      { error: "Unexpected error", details: err.message },
      { status: 500 }
    );
  }
}
