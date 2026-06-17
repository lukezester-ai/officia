export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { bootstrapWorkspace } from "@/lib/workspaces/bootstrap";

const DOCUMENTS_BUCKET = process.env.SUPABASE_DOCUMENTS_BUCKET || "officia-documents";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function sanitizeFileName(fileName: string) {
  const cleaned = fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || "document";
}

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase Storage is not configured." }, { status: 503 });
  }

  const workspace = await bootstrapWorkspace();

  if (workspace.status !== "ready" || !workspace.workspaceId) {
    return NextResponse.json({ error: "Workspace is not ready." }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  const fileName = typeof body?.fileName === "string" ? body.fileName : "";
  const fileType = typeof body?.fileType === "string" ? body.fileType : "application/octet-stream";
  const fileSize = typeof body?.fileSize === "number" ? body.fileSize : 0;

  if (!fileName) {
    return NextResponse.json({ error: "fileName is required." }, { status: 400 });
  }

  if (fileSize > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File size must be 10MB or less." }, { status: 400 });
  }

  const storagePath = `workspaces/${workspace.workspaceId}/${Date.now()}-${sanitizeFileName(fileName)}`;
  const response = await fetch(`${supabaseUrl}/storage/v1/object/upload/sign/${DOCUMENTS_BUCKET}/${storagePath}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ upsert: false, contentType: fileType }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      { error: typeof payload?.message === "string" ? payload.message : "Could not create signed upload URL." },
      { status: response.status },
    );
  }

  const token = typeof payload?.token === "string" ? payload.token : null;
  const signedUrl = typeof payload?.signedURL === "string" ? payload.signedURL : typeof payload?.signedUrl === "string" ? payload.signedUrl : null;

  if (!token && !signedUrl) {
    return NextResponse.json({ error: "Supabase did not return an upload token." }, { status: 502 });
  }

  return NextResponse.json({
    bucket: DOCUMENTS_BUCKET,
    storagePath,
    token,
    signedUrl: signedUrl ? `${supabaseUrl}/storage/v1${signedUrl}` : null,
  });
}
