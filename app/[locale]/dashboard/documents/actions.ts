"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { bootstrapWorkspace } from "@/lib/workspaces/bootstrap";

export async function createDocumentAction(formData: FormData) {
  const workspace = await bootstrapWorkspace();

  if (!db || workspace.status !== "ready" || !workspace.workspaceId) {
    redirect("/dashboard/documents?created=database-not-ready");
  }

  const fileName = String(formData.get("fileName") || "").trim();
  const fileType = String(formData.get("fileType") || "").trim() || null;
  const storagePath = String(formData.get("storagePath") || "").trim() || null;
  const aiSummary = String(formData.get("aiSummary") || "").trim() || null;

  if (!fileName) {
    redirect("/dashboard/documents?created=missing-fields");
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

    revalidatePath("/dashboard/documents");
    redirect("/dashboard/documents?created=success");
  } catch (error) {
    console.error("Failed to create document:", error);
    redirect("/dashboard/documents?created=error");
  }
}
