import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";

export type DocumentStatus = "uploaded" | "processing" | "ready" | "failed";

export type DocumentRecord = {
  id: string;
  fileName: string;
  fileType: string | null;
  storagePath: string | null;
  status: DocumentStatus;
  aiSummary: string | null;
  createdAt: Date;
};

export type DocumentListState = {
  status: "ready" | "preview" | "error";
  message: string;
  documents: DocumentRecord[];
};

export type ExtractedField = {
  label: string;
  value: string;
};

export type DocumentTask = {
  id: string;
  title: string;
  owner: string;
  due: string;
  priority: "high" | "medium" | "low";
};

export type DocumentInboxItem = DocumentRecord & {
  documentType: "Invoice" | "Contract" | "Bank statement" | "Receipt" | "General document";
  confidence: number;
  risk: "low" | "medium" | "high";
  aiSummary: string;
  extractedFields: ExtractedField[];
  tasks: DocumentTask[];
};

const previewDocuments: DocumentRecord[] = [
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
  {
    id: "preview-doc-3",
    fileName: "bank-statement-january.csv",
    fileType: "text/csv",
    storagePath: null,
    status: "uploaded",
    aiSummary: "Bank statement ready for reconciliation with open invoices.",
    createdAt: new Date("2026-02-01T00:00:00.000Z"),
  },
];

function detectDocumentType(fileName: string): DocumentInboxItem["documentType"] {
  const name = fileName.toLowerCase();

  if (name.includes("invoice") || name.includes("faktura") || name.includes("factura")) {
    return "Invoice";
  }

  if (name.includes("contract") || name.includes("agreement") || name.includes("dogovor")) {
    return "Contract";
  }

  if (name.includes("bank") || name.includes("statement") || name.includes("reconciliation")) {
    return "Bank statement";
  }

  if (name.includes("receipt") || name.includes("expense")) {
    return "Receipt";
  }

  return "General document";
}

function fieldsForType(type: DocumentInboxItem["documentType"], document: DocumentRecord): ExtractedField[] {
  if (type === "Invoice") {
    return [
      { label: "Supplier", value: document.fileName.includes("acme") ? "ACME Logistics" : "Detected supplier" },
      { label: "Total", value: "EUR 2,840.00" },
      { label: "VAT", value: "EUR 473.33" },
      { label: "Due date", value: "7 days" },
    ];
  }

  if (type === "Contract") {
    return [
      { label: "Counterparty", value: "Detected counterparty" },
      { label: "Effective date", value: "Pending review" },
      { label: "Signature", value: "Required" },
      { label: "Notice period", value: "30 days" },
    ];
  }

  if (type === "Bank statement") {
    return [
      { label: "Account", value: "Operating account" },
      { label: "Transactions", value: "42 detected" },
      { label: "Unmatched", value: "6 payments" },
      { label: "Period", value: "Current month" },
    ];
  }

  if (type === "Receipt") {
    return [
      { label: "Merchant", value: "Detected merchant" },
      { label: "Amount", value: "Pending validation" },
      { label: "Category", value: "Office expense" },
      { label: "VAT", value: "Check needed" },
    ];
  }

  return [
    { label: "Owner", value: "Workspace" },
    { label: "Classification", value: "Needs review" },
    { label: "Retention", value: "Archive after processing" },
    { label: "Next step", value: "Assign reviewer" },
  ];
}

function tasksForType(type: DocumentInboxItem["documentType"], document: DocumentRecord): DocumentTask[] {
  const prefix = document.id;

  if (type === "Invoice") {
    return [
      { id: `${prefix}-vat`, title: "Validate VAT and invoice total", owner: "Accounting", due: "Today", priority: "high" },
      { id: `${prefix}-payment`, title: "Schedule payment or match bank transfer", owner: "Finance", due: "This week", priority: "medium" },
    ];
  }

  if (type === "Contract") {
    return [
      { id: `${prefix}-signature`, title: "Send contract for signature", owner: "Admin", due: "Tomorrow", priority: "high" },
      { id: `${prefix}-reminder`, title: "Create renewal reminder", owner: "Operations", due: "This week", priority: "medium" },
    ];
  }

  if (type === "Bank statement") {
    return [
      { id: `${prefix}-match`, title: "Match statement lines to open invoices", owner: "Finance", due: "Today", priority: "high" },
      { id: `${prefix}-exceptions`, title: "Review unmatched payments", owner: "Accounting", due: "Tomorrow", priority: "medium" },
    ];
  }

  return [
    { id: `${prefix}-review`, title: "Review extracted document details", owner: "Operations", due: "This week", priority: "medium" },
  ];
}

function summaryForType(type: DocumentInboxItem["documentType"], document: DocumentRecord) {
  if (document.aiSummary) {
    return document.aiSummary;
  }

  if (document.status === "processing") {
    return "Extraction is queued. Officia will classify the document, pull key fields and create follow-up work.";
  }

  if (type === "Invoice") {
    return "Invoice-like document detected. Key totals, VAT and payment timing are ready for review.";
  }

  if (type === "Contract") {
    return "Contract-like document detected. Signature state, renewal timing and obligations need confirmation.";
  }

  if (type === "Bank statement") {
    return "Bank data detected. The next step is matching transactions against invoices and expenses.";
  }

  return "Document is ready for classification and operational follow-up.";
}

export function buildDocumentInbox(documents: DocumentRecord[]) {
  const items = documents.map<DocumentInboxItem>((document, index) => {
    const documentType = detectDocumentType(document.fileName);
    const isReady = document.status === "ready" || Boolean(document.aiSummary);
    const confidence = isReady ? 94 - Math.min(index * 3, 12) : document.status === "processing" ? 62 : 78;
    const risk = document.status === "failed" ? "high" : documentType === "Invoice" || documentType === "Bank statement" ? "medium" : "low";

    return {
      ...document,
      documentType,
      confidence,
      risk,
      aiSummary: summaryForType(documentType, document),
      extractedFields: fieldsForType(documentType, document),
      tasks: tasksForType(documentType, document),
    };
  });

  const tasks = items.flatMap((item) => item.tasks.map((task) => ({ ...task, documentName: item.fileName })));
  const readyCount = items.filter((item) => item.status === "ready").length;
  const processingCount = items.filter((item) => item.status === "processing" || item.status === "uploaded").length;
  const highPriorityCount = tasks.filter((task) => task.priority === "high").length;

  return {
    items,
    tasks,
    metrics: {
      total: items.length,
      ready: readyCount,
      processing: processingCount,
      highPriority: highPriorityCount,
    },
  };
}

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