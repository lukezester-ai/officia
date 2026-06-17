import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, FileText } from "lucide-react";
import { InvoicePrintButton } from "./print-button";
import { getWorkspaceInvoiceDetail } from "@/lib/invoices/service";
import { bootstrapWorkspace } from "@/lib/workspaces/bootstrap";

function formatMoney(value: string, currency: string) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(Number(value));
}

function formatDate(date: Date | null) {
  if (!date) return "No due date";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function lineSubtotal(quantity: string, unitPrice: string) {
  return Number(quantity) * Number(unitPrice);
}

export default async function InvoicePreviewPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  const workspace = await bootstrapWorkspace();
  const invoice = await getWorkspaceInvoiceDetail(workspace.workspaceId, invoiceId);

  if (!invoice) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto mb-6 flex max-w-5xl flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/dashboard/invoices" className="inline-flex items-center gap-2 text-sm font-bold text-indigoElectric transition hover:text-navy">
          <ArrowLeft size={16} /> Back to invoices
        </Link>
        <InvoicePrintButton />
      </div>

      <article className="invoice-sheet mx-auto max-w-5xl bg-white p-8 shadow-xl shadow-slate-900/10 print:max-w-none print:shadow-none sm:p-10">
        <header className="flex flex-col gap-8 border-b border-slate-200 pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy text-white print:bg-slate-900">
                <Building2 size={22} />
              </span>
              <div>
                <p className="font-display text-3xl font-semibold text-navy">Officia</p>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Invoice</p>
              </div>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-500">
              {workspace.workspaceName}<br />
              European AI office OS for accountants and office teams
            </p>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigoElectric">{invoice.status}</p>
            <h1 className="mt-2 font-display text-4xl font-semibold text-navy">{invoice.invoiceNumber}</h1>
            <dl className="mt-5 grid gap-2 text-sm">
              <div>
                <dt className="font-bold text-slate-400">Issued</dt>
                <dd className="font-semibold text-slate-700">{formatDate(invoice.createdAt)}</dd>
              </div>
              <div>
                <dt className="font-bold text-slate-400">Due</dt>
                <dd className="font-semibold text-slate-700">{formatDate(invoice.dueDate)}</dd>
              </div>
            </dl>
          </div>
        </header>

        <section className="grid gap-6 border-b border-slate-200 py-8 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-5 print:border print:border-slate-200 print:bg-white">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Bill to</p>
            <h2 className="mt-3 text-xl font-bold text-navy">{invoice.clientName}</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">{invoice.clientEmail || "No client email"}</p>
          </div>
          <div className="rounded-2xl bg-indigo-50 p-5 print:border print:border-slate-200 print:bg-white">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigoElectric">Amount due</p>
            <p className="mt-3 font-display text-4xl font-semibold text-navy">{formatMoney(invoice.total, invoice.currency)}</p>
            <p className="mt-2 text-sm font-semibold text-slate-500">Includes VAT where applicable</p>
          </div>
        </section>

        <section className="py-8">
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="hidden grid-cols-[1.4fr_0.45fr_0.65fr_0.5fr_0.7fr] gap-4 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400 md:grid">
              <span>Description</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Unit</span>
              <span className="text-right">VAT</span>
              <span className="text-right">Total</span>
            </div>
            {invoice.lineItems.map((item) => (
              <div key={item.id} className="grid gap-3 border-t border-slate-200 px-4 py-4 text-sm md:grid-cols-[1.4fr_0.45fr_0.65fr_0.5fr_0.7fr] md:items-center">
                <div>
                  <span className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-400 md:hidden">Description</span>
                  <span className="font-semibold text-navy">{item.description}</span>
                </div>
                <div className="md:text-right">
                  <span className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-400 md:hidden">Qty</span>
                  {Number(item.quantity).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </div>
                <div className="md:text-right">
                  <span className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-400 md:hidden">Unit</span>
                  {formatMoney(item.unitPrice, invoice.currency)}
                </div>
                <div className="md:text-right">
                  <span className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-400 md:hidden">VAT</span>
                  {Number(item.taxRate).toLocaleString("en-GB", { maximumFractionDigits: 2 })}%
                </div>
                <div className="font-bold text-navy md:text-right">
                  <span className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-400 md:hidden">Total</span>
                  {formatMoney(item.lineTotal, invoice.currency)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex justify-end border-b border-slate-200 pb-8">
          <dl className="grid w-full max-w-sm gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="font-semibold text-slate-500">Subtotal</dt>
              <dd className="font-bold text-slate-900">{formatMoney(invoice.subtotal, invoice.currency)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="font-semibold text-slate-500">VAT</dt>
              <dd className="font-bold text-slate-900">{formatMoney(invoice.tax, invoice.currency)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-3 text-lg">
              <dt className="font-bold text-navy">Total</dt>
              <dd className="font-display text-2xl font-semibold text-navy">{formatMoney(invoice.total, invoice.currency)}</dd>
            </div>
          </dl>
        </section>

        <footer className="flex flex-col gap-4 pt-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 font-semibold text-slate-600">
            <FileText size={16} className="text-indigoElectric" /> Generated by Officia
          </div>
          <p>Thank you for your business.</p>
        </footer>
      </article>
    </main>
  );
}