import { Link } from "@/i18n/routing";
import { ArrowLeft, Bot, CheckCircle2, FileText, FolderOpen, UploadCloud } from "lucide-react";
import { DocumentUploadForm } from "./upload-form";
import { listWorkspaceDocuments } from "@/lib/documents/service";
import { bootstrapWorkspace } from "@/lib/workspaces/bootstrap";

const statusStyles = {
  uploaded: "bg-indigo-50 text-indigo-700",
  processing: "bg-amber-50 text-amber-700",
  ready: "bg-emerald-50 text-emerald-700",
  failed: "bg-rose-50 text-rose-700",
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

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string }>;
}) {
  const params = await searchParams;
  const workspace = await bootstrapWorkspace();
  const documentState = await listWorkspaceDocuments(workspace.workspaceId);
  const createdMessage = params?.created ? createdMessages[params.created] : null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200/80 bg-white/80 px-6 py-5 backdrop-blur-xl lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-indigoElectric transition hover:text-navy">
              <ArrowLeft size={16} /> Back to dashboard
            </Link>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-indigoElectric">Documents</p>
            <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight text-navy">Document workspace</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">{workspace.workspaceName} · {documentState.message}</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-indigo-50 px-4 py-3 text-sm font-bold text-indigoElectric">
            <FolderOpen size={18} /> {documentState.documents.length} documents
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <article className="rounded-[2rem] border border-white bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigoElectric">
              <UploadCloud size={22} />
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold text-navy">Upload document</h2>
              <p className="text-sm text-slate-500">Upload to Supabase Storage and save metadata.</p>
            </div>
          </div>

          <DocumentUploadForm createdMessage={createdMessage} createdStatus={params?.created} />
        </article>

        <article className="rounded-[2rem] border border-white bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-semibold text-navy">Recent documents</h2>
              <p className="mt-1 text-sm text-slate-500">Prepared for Supabase Storage and AI document extraction.</p>
            </div>
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
          </div>

          <div className="mt-6 grid gap-4">
            {documentState.documents.length ? (
              documentState.documents.map((document) => (
                <div key={document.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-navy">{document.fileName}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">{document.fileType || "Unknown type"} · {formatDate(document.createdAt)}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[document.status]}`}>{document.status}</span>
                  </div>
                  <div className="mt-4 flex items-start gap-3 rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                    <Bot className="mt-1 shrink-0 text-indigoElectric" size={18} />
                    {document.aiSummary || "AI summary will appear after document extraction runs."}
                  </div>
                </div>
              ))
            ) : (
              <div className="grid place-items-center gap-3 rounded-3xl bg-slate-50 px-6 py-16 text-center">
                <FileText className="text-indigoElectric" size={34} />
                <h3 className="font-display text-2xl font-semibold text-navy">No documents yet</h3>
                <p className="max-w-md text-sm leading-6 text-slate-500">Add the first document record for this workspace.</p>
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
            <CheckCircle2 className="text-indigoElectric" size={18} /> Next: document viewer, signed download URLs and AI extraction jobs.
          </div>
        </article>
      </section>
    </main>
  );
}
