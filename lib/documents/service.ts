import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";

export type DocumentListState = {
  status: "ready" | "preview" | "error";
  message: string;
  documents: Array<{
    id: string;
    fileName: string;
    fileType: string | null;
    storagePath: string | null;
    status: "uploaded" | "processing" | "ready" | "failed";
    aiSummary: string | null;
    createdAt: Date;
  }>;
};

const previewDocuments: DocumentListState["documents"] = [
  {
    id: "preview-doc-1",
    fileName: "supplier-invoice-acme.pdf",
    fileType: "application/pdf",
    storagePath: null,
    status: "ready",
    aiSummary: "Supplier invoice detected with VAT amount and payment deadline.",
    createdAt: new Date("2026-01-30T00:00:00.000Z"),
  },
  {
    id: "preview-doc-2",
    fileName: "employment-contract.docx",
    fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    storagePath: null,
    status: "processing",
    aiSummary: null,
    createdAt: new Date("2026-01-31T00:00:00.000Z"),
  },
];

export async function listWorkspaceDocuments(workspaceId: string | null): Promise<DocumentListState> {
  if (!workspaceId || !db) {
    return {
      status: "preview",
      message: "Documents are shown in preview mode until DATABASE_URL and workspace bootstrap are ready.",
      documents: previewDocuments,
    };
  }

  try {
    const rows = await db
      .select({
        id: documents.id,
        fileName: documents.fileName,
        fileType: documents.fileType,
        storagePath: documents.storagePath,
        status: documents.status,
        aiSummary: documents.aiSummary,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .where(eq(documents.workspaceId, workspaceId))
      .orderBy(desc(documents.createdAt));

    return {
      status: "ready",
      message: rows.length ? "Loaded from Supabase." : "No documents yet. Add the first document record.",
      documents: rows,
    };
  } catch (error) {
    console.error("Failed to list documents:", error);
    return {
      status: "error",
      message: "Could not load documents. Check DATABASE_URL and run supabase-app-schema.sql.",
      documents: previewDocuments,
    };
  }
}
