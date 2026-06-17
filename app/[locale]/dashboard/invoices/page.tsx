import { Link } from "@/i18n/routing";
import { ArrowLeft, CheckCircle2, FileText, Plus, ReceiptText } from "lucide-react";
import { createInvoiceAction } from "./actions";
import { listWorkspaceInvoices } from "@/lib/invoices/service";
import { bootstrapWorkspace } from "@/lib/workspaces/bootstrap";
import { getTranslations } from "next-intl/server";

const statusStyles = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-indigo-50 text-indigo-700",
  paid: "bg-emerald-50 text-emerald-700",
  overdue: "bg-rose-50 text-rose-700",
  void: "bg-zinc-100 text-zinc-600",
};

const lineItemSlots = [
  { label: "Line 1", defaultTaxRate: "20" },
  { label: "Line 2", defaultTaxRate: "20" },
  { label: "Line 3", defaultTaxRate: "20" },
];

function formatMoney(total: string, currency: string) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(Number(total));
}

function formatDate(date: Date | null) {
  if (!date) return "No due date";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string }>;
}) {
  const params = await searchParams;
  const workspace = await bootstrapWorkspace();
  const invoiceState = await listWorkspaceInvoices(workspace.workspaceId);
  const t = await getTranslations("Invoices");

  const createdMessages: Record<string, string> = {
    success: t("title"),
    "database-not-ready": "Database workspace is not ready yet.",
    "missing-fields": "Invoice number, client name and at least one billable line are required.",
    error: "Could not create invoice. The invoice number may already exist.",
  };

  const createdMessage = params?.created ? createdMessages[params.created] : null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200/80 bg-white/80 px-6 py-5 backdrop-blur-xl lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-indigoElectric transition hover:text-navy">
              <ArrowLeft size={16} /> Back to dashboard
            </Link>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-indigoElectric">{t("title")}</p>
            <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight text-navy">{t("subtitle")}</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">{workspace.workspaceName} - {invoiceState.message}</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-indigo-50 px-4 py-3 text-sm font-bold text-indigoElectric">
            <ReceiptText size={18} /> {invoiceState.invoices.length} {t("title")}
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <article className="rounded-[2rem] border border-white bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigoElectric">
              <Plus size={22} />
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold text-navy">{t("createInvoice")}</h2>
              <p className="text-sm text-slate-500">Draft invoice with line items, VAT and totals.</p>
            </div>
          </div>

          <form action={createInvoiceAction} className="mt-6 grid gap-4">
            {createdMessage ? (
              <div className={`rounded-2xl px-4 py-3 text-sm font-bold ${params?.created === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                {createdMessage}
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Invoice number
                <input name="invoiceNumber" required placeholder="INV-2051" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none ring-indigo-200 focus:ring-4" />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Currency
                <select name="currency" defaultValue="EUR" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none ring-indigo-200 focus:ring-4">
                  <option value="EUR">EUR</option>
                  <option value="BGN">BGN</option>
                  <option value="USD">USD</option>
                </select>
              </label>
            </div>
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              {t("clientName")}
              <input name="clientName" required placeholder="Client Ltd" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none ring-indigo-200 focus:ring-4" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Client email
                <input name="clientEmail" type="email" placeholder="finance@client.com" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none ring-indigo-200 focus:ring-4" />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Due date
                <input name="dueDate" type="date" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none ring-indigo-200 focus:ring-4" />
              </label>
            </div>

            <div className="grid gap-3 rounded-3xl bg-slate-50 p-4">
              <div>
                <h3 className="text-sm font-bold text-navy">Line items</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">Add at least one billable item. Empty rows are ignored.</p>
              </div>
              {lineItemSlots.map((slot, index) => (
                <div key={slot.label} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{slot.label}</div>
                  <label className="grid gap-2 text-sm font-bold text-slate-700">
                    Description
                    <input name="itemDescription" required={index === 0} placeholder={index === 0 ? "Accounting services" : "Optional line"} className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none ring-indigo-200 focus:ring-4" />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="grid gap-2 text-sm font-bold text-slate-700">
                      Qty
                      <input name="itemQuantity" type="number" min="0" step="0.01" defaultValue={index === 0 ? "1" : ""} className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none ring-indigo-200 focus:ring-4" />
                    </label>
                    <label className="grid gap-2 text-sm font-bold text-slate-700">
                      Unit price
                      <input name="itemUnitPrice" type="number" min="0" step="0.01" required={index === 0} placeholder="1200.00" className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none ring-indigo-200 focus:ring-4" />
                    </label>
                    <label className="grid gap-2 text-sm font-bold text-slate-700">
                      VAT %
                      <input name="itemTaxRate" type="number" min="0" step="0.01" defaultValue={slot.defaultTaxRate} className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none ring-indigo-200 focus:ring-4" />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <button type="submit" className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-indigoElectric px-5 text-sm font-bold text-white shadow-glow transition hover:bg-navy">
              <Plus size={16} /> Save draft invoice
            </button>
          </form>
        </article>

        <article className="rounded-[2rem] border border-white bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-semibold text-navy">{t("title")}</h2>
              <p className="mt-1 text-sm text-slate-500">Live from Supabase when the workspace database is ready.</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                invoiceState.status === "ready"
                  ? "bg-emerald-50 text-emerald-700"
                  : invoiceState.status === "error"
                    ? "bg-rose-50 text-rose-700"
                    : "bg-amber-50 text-amber-700"
              }`}
            >
              {invoiceState.status === "ready" ? "Live data" : invoiceState.status === "error" ? "Fallback data" : "Preview data"}
            </span>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100">
            {invoiceState.invoices.length ? (
              invoiceState.invoices.map((invoice) => (
                <div key={invoice.id} className="grid gap-3 border-b border-slate-100 bg-white px-4 py-4 last:border-b-0 xl:grid-cols-[0.75fr_1fr_0.65fr_0.65fr_0.75fr_0.75fr_0.55fr] xl:items-center">
                  <div className="font-bold text-navy">{invoice.invoiceNumber}</div>
                  <div className="text-sm font-semibold text-slate-600">{invoice.clientName}</div>
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Net</span>
                    <span className="text-sm font-bold text-slate-900">{formatMoney(invoice.subtotal, invoice.currency)}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-400">VAT</span>
                    <span className="text-sm font-bold text-slate-900">{formatMoney(invoice.tax, invoice.currency)}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Total</span>
                    <span className="text-sm font-bold text-slate-900">{formatMoney(invoice.total, invoice.currency)}</span>
                  </div>
                  <div className="grid gap-2">
                    <span className="text-sm text-slate-500">{formatDate(invoice.dueDate)}</span>
                    <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${statusStyles[invoice.status]}`}>{invoice.status}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="grid place-items-center gap-3 bg-slate-50 px-6 py-16 text-center">
                <FileText className="text-indigoElectric" size={34} />
                <h3 className="font-display text-2xl font-semibold text-navy">No invoices yet</h3>
                <p className="max-w-md text-sm leading-6 text-slate-500">Create the first invoice draft for this workspace.</p>
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
            <CheckCircle2 className="text-indigoElectric" size={18} /> Next: email sending and status workflow.
          </div>
        </article>
      </section>
    </main>
  );
}


