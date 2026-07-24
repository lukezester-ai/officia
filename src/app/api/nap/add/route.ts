// src/app/api/nap/add/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { napIntegrations } from "@/lib/db/schema/nap_integrations";
import { encryptApiKey } from "@/lib/nap/encryption";
import { v4 as uuidv4 } from "uuid";

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
import { requireTenant } from "@/lib/auth/get-tenant";

export async function POST(req: Request) {
  try {
    const { tenant, userId } = await requireTenant();
    if (!tenant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eik, apiKey } = await req.json();

    if (!eik || !apiKey) {
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
        id: uuidv4(),
        organizationId: tenant.id,
        eik,
        encryptedApiKey: encrypted,
        encryptionIv: iv,
        connectedByUserId: userId,
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
