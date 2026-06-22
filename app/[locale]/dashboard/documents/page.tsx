import { Link } from "@/i18n/routing";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileCheck2,
  FileText,
  FolderOpen,
  Gauge,
  ListChecks,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { DocumentUploadForm } from "./upload-form";
import { buildDocumentInbox, listWorkspaceDocuments, type DocumentInboxItem, type DocumentStatus } from "@/lib/documents/service";
import { bootstrapWorkspace } from "@/lib/workspaces/bootstrap";

const statusStyles: Record<DocumentStatus, string> = {
  uploaded: "bg-indigo-50 text-indigo-700",
  processing: "bg-amber-50 text-amber-700",
  ready: "bg-emerald-50 text-emerald-700",
  failed: "bg-rose-50 text-rose-700",
};

const priorityStyles = {
  high: "bg-rose-50 text-rose-700",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};

const riskStyles = {
  high: "bg-rose-50 text-rose-700",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-emerald-50 text-emerald-700",
};

const createdMessages: Record<string, string> = {
  success: "Document record created successfully.",
  "database-not-ready": "Database workspace is not ready yet.",
  "missing-fields": "File name is required.",
  error: "Could not create document record.",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatFileType(type: string | null) {
  if (!type) {
    return "Unknown type";
  }

  if (type.includes("pdf")) {
    return "PDF";
  }

  if (type.includes("spreadsheet") || type.includes("csv")) {
    return "Spreadsheet";
  }

  if (type.includes("word")) {
    return "Word document";
  }

  return type;
}

function DocumentQueueItem({ document, active }: { document: DocumentInboxItem; active?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 transition ${active ? "border-indigo-200 bg-indigo-50/70" : "border-slate-100 bg-white hover:border-indigo-100"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="shrink-0 text-indigoElectric" size={18} />
            <h3 className="truncate text-sm font-bold text-navy">{document.fileName}</h3>
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500">
            {document.documentType} / {formatFileType(document.fileType)} / {formatDate(document.createdAt)}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusStyles[document.status]}`}>{document.status}</span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Gauge size={14} /> {document.confidence}% confidence
        </span>
        <span className={`rounded-full px-2.5 py-1 ${riskStyles[document.risk]}`}>{document.risk} risk</span>
      </div>
    </div>
  );
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string }>;
}) {
  const params = await searchParams;
  const workspace = await bootstrapWorkspace();
  const documentState = await listWorkspaceDocuments(workspace.workspaceId);
  const inbox = buildDocumentInbox(documentState.documents);
  const createdMessage = params?.created ? createdMessages[params.created] : null;
  const selectedDocument = inbox.items[0] ?? null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200/80 bg-white/85 px-6 py-5 backdrop-blur-xl lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-indigoElectric transition hover:text-navy">
              <ArrowLeft size={16} /> Back to dashboard
            </Link>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-indigoElectric">Document inbox</p>
            <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight text-navy">AI document operations</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">{workspace.workspaceName} / {documentState.message}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                documentState.status === "ready"
                  ? "bg-emerald-50 text-emerald-700"
                  : documentState.status === "error"
                    ? "bg-rose-50 text-rose-700"
                    : "bg-amber-50 text-amber-700"
              }`}
            >
              {documentState.status === "ready" ? "Live data" : documentState.status === "error" ? "Fallback data" : "Preview data"}
            </span>
            <div className="flex items-center gap-3 rounded-2xl bg-indigo-50 px-4 py-3 text-sm font-bold text-indigoElectric">
              <FolderOpen size={18} /> {inbox.metrics.total} documents
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "In inbox", value: inbox.metrics.total, detail: "Awaiting review", icon: FolderOpen },
            { label: "AI ready", value: inbox.metrics.ready, detail: "Extracted records", icon: Sparkles },
            { label: "In progress", value: inbox.metrics.processing, detail: "Upload or extraction", icon: CalendarClock },
            { label: "Priority tasks", value: inbox.metrics.highPriority, detail: "Needs action", icon: AlertTriangle },
          ].map(({ label, value, detail, icon: Icon }) => (
            <article key={label} className="rounded-3xl border border-white bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
                  <p className="mt-3 text-3xl font-semibold text-navy">{value}</p>
                  <p className="mt-2 text-sm font-semibold text-indigoElectric">{detail}</p>
                </div>
                <div className="rounded-2xl bg-indigo-50 p-3 text-indigoElectric">
                  <Icon size={22} />
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
          <article className="rounded-[2rem] border border-white bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigoElectric">
                <UploadCloud size={22} />
              </div>
              <div>
                <h2 className="font-display text-2xl font-semibold text-navy">Capture document</h2>
                <p className="text-sm text-slate-500">Upload, classify and queue work from one place.</p>
              </div>
            </div>

            <DocumentUploadForm createdMessage={createdMessage} createdStatus={params?.created} />

            <div className="mt-6 rounded-3xl bg-navy p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigoElectric">
                  <Bot size={21} />
                </div>
                <div>
                  <p className="text-sm font-bold">Extraction pipeline</p>
                  <p className="text-xs text-slate-300">Classify, extract, validate, assign</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {["Detect document type", "Read totals, dates and parties", "Create review tasks"].map((step, index) => (
                  <div key={step} className="flex items-center gap-3 rounded-2xl bg-white/8 px-4 py-3 text-sm font-semibold text-slate-100">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/10 text-xs">{index + 1}</span>
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </article>

          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <article className="rounded-[2rem] border border-white bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-navy">Inbox queue</h2>
                  <p className="mt-1 text-sm text-slate-500">Newest documents are reviewed first.</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigoElectric">
                  <ListChecks size={14} /> Triage
                </span>
              </div>

              <div className="mt-6 grid gap-3">
                {inbox.items.length ? (
                  inbox.items.map((document, index) => <DocumentQueueItem key={document.id} document={document} active={index === 0} />)
                ) : (
                  <div className="grid place-items-center gap-3 rounded-3xl bg-slate-50 px-6 py-16 text-center">
                    <FileText className="text-indigoElectric" size={34} />
                    <h3 className="font-display text-2xl font-semibold text-navy">No documents yet</h3>
                    <p className="max-w-md text-sm leading-6 text-slate-500">Upload the first document to start extraction and task generation.</p>
                  </div>
                )}
              </div>
            </article>

            <article className="rounded-[2rem] border border-white bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-navy">AI extraction</h2>
                  <p className="mt-1 text-sm text-slate-500">Preview of fields Officia will use downstream.</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  <ShieldCheck size={14} /> Human review
                </span>
              </div>

              {selectedDocument ? (
                <div className="mt-6">
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigoElectric">Selected document</p>
                        <h3 className="mt-2 font-display text-2xl font-semibold text-navy">{selectedDocument.documentType}</h3>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${riskStyles[selectedDocument.risk]}`}>{selectedDocument.risk} risk</span>
                    </div>
                    <div className="mt-5 flex items-start gap-3 rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                      <Bot className="mt-1 shrink-0 text-indigoElectric" size={18} />
                      {selectedDocument.aiSummary}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {selectedDocument.extractedFields.map((field) => (
                      <div key={field.label} className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{field.label}</p>
                        <p className="mt-1 text-sm font-bold text-navy">{field.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-800">
                    <CheckCircle2 className="mr-2 inline-block" size={18} /> Confidence: {selectedDocument.confidence}%. Values stay pending until approved.
                  </div>
                </div>
              ) : (
                <div className="mt-6 grid place-items-center gap-3 rounded-3xl bg-slate-50 px-6 py-16 text-center">
                  <ReceiptText className="text-indigoElectric" size={34} />
                  <h3 className="font-display text-2xl font-semibold text-navy">Nothing selected</h3>
                  <p className="max-w-md text-sm leading-6 text-slate-500">Upload a document to see extracted fields here.</p>
                </div>
              )}
            </article>
          </section>
        </section>

        <section className="mt-6 rounded-[2rem] border border-white bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-semibold text-navy">Generated tasks</h2>
              <p className="mt-1 text-sm text-slate-500">Operational follow-up created from document context.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigoElectric">
              <ClipboardList size={14} /> {inbox.tasks.length} tasks
            </span>
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-2">
            {inbox.tasks.length ? (
              inbox.tasks.map((task) => (
                <div key={task.id} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-indigoElectric">
                      <FileCheck2 size={18} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-navy">{task.title}</h3>
                      <p className="mt-1 truncate text-xs font-semibold text-slate-500">{task.documentName}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                        <span>{task.owner}</span>
                        <ChevronRight size={14} />
                        <span>{task.due}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${priorityStyles[task.priority]}`}>{task.priority}</span>
                </div>
              ))
            ) : (
              <div className="rounded-3xl bg-slate-50 px-6 py-10 text-center text-sm font-semibold text-slate-500 lg:col-span-2">
                No generated tasks yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}