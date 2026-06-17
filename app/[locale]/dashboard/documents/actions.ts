"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { bootstrapWorkspace } from "@/lib/workspaces/bootstrap";

function localizedDocumentsPath(locale: string, status: string) {
  return `/${locale}/dashboard/documents?created=${status}`;
}

export async function createDocumentAction(formData: FormData) {
  const locale = await getLocale();
  const workspace = await bootstrapWorkspace();

  if (!db || workspace.status !== "ready" || !workspace.workspaceId) {
    redirect(localizedDocumentsPath(locale, "database-not-ready"));
  }

  const fileName = String(formData.get("fileName") || "").trim();
  const fileType = String(formData.get("fileType") || "").trim() || null;
  const storagePath = String(formData.get("storagePath") || "").trim() || null;
  const aiSummary = String(formData.get("aiSummary") || "").trim() || null;

  if (!fileName) {
    redirect(localizedDocumentsPath(locale, "missing-fields"));
  }

  try {
    await db.insert(documents).values({
      workspaceId: workspace.workspaceId,
      fileName,
      fileType,
      storagePath,
      status: storagePath ? "uploaded" : "processing",
      aiSummary,
    });

    revalidatePath(`/${locale}/dashboard/documents`);
    redirect(localizedDocumentsPath(locale, "success"));
  } catch (error) {
    console.error("Failed to create document:", error);
    redirect(localizedDocumentsPath(locale, "error"));
  }
}
