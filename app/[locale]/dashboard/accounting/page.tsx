import { ArrowLeft, ArrowRight, FileText, ReceiptText, TrendingDown } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { bootstrapWorkspace } from "@/lib/workspaces/bootstrap";

export default async function AccountingPage() {
  const workspace = await bootstrapWorkspace();
  const t = await getTranslations("Accounting");

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200/80 bg-white/80 px-6 py-5 backdrop-blur-xl lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-indigoElectric transition hover:text-navy">
              <ArrowLeft size={16} /> {t("back")}
            </Link>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-indigoElectric">{t("status")}</p>
            <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight text-navy">{t("title")}</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">{workspace.workspaceName} - {t("subtitle")}</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-indigo-50 px-4 py-3 text-sm font-bold text-indigoElectric">
            <FileText size={18} /> Officia Accounting
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-2 lg:px-8">
        <Link href="/dashboard/invoices" className="group rounded-[2rem] border border-white bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-900/10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigoElectric transition group-hover:bg-indigoElectric group-hover:text-white">
            <ReceiptText size={22} />
          </div>
          <h2 className="mt-5 font-display text-3xl font-semibold text-navy">{t("invoicesTitle")}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">{t("invoicesDesc")}</p>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-indigoElectric">
            {t("invoicesCta")} <ArrowRight size={16} />
          </span>
        </Link>

        <article className="rounded-[2rem] border border-white bg-white p-6 shadow-sm opacity-85">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <TrendingDown size={22} />
          </div>
          <h2 className="mt-5 font-display text-3xl font-semibold text-navy">{t("expensesTitle")}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">{t("expensesDesc")}</p>
          <span className="mt-6 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
            {t("expensesCta")}
          </span>
        </article>
      </section>
    </main>
  );
}
