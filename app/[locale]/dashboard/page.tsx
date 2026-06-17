import { UserButton } from "@clerk/nextjs";
import { Link } from "@/i18n/routing";
import { bootstrapWorkspace } from "@/lib/workspaces/bootstrap";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  BarChart3,
  Bell,
  Bot,
  Building2,
  CalendarDays,
  Clock3,
  CheckCircle2,
  ChevronRight,
  FileText,
  FolderOpen,
  Landmark,
  LayoutDashboard,
  CreditCard,
  ReceiptText,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

export default async function DashboardPage() {
  const workspace = await bootstrapWorkspace();
  const t = await getTranslations("Dashboard");

  const navItems = [
    { label: t("nav.overview"), icon: LayoutDashboard, active: true, href: "/dashboard" },
    { label: t("nav.accounting"), icon: FileText, href: "/dashboard/accounting" },
    { label: t("nav.invoices"), icon: ReceiptText, href: "/dashboard/invoices" },
    { label: t("nav.documents"), icon: FolderOpen, href: "/dashboard/documents" },
    { label: t("nav.time"), icon: Clock3, href: "/dashboard/time" },
    { label: t("nav.hr"), icon: Users, href: "/dashboard" },
    { label: t("nav.ai"), icon: Bot, href: "/dashboard" },
    { label: t("nav.billing"), icon: CreditCard, href: "/pricing" },
    { label: t("nav.reports"), icon: BarChart3, href: "/dashboard" },
  ];

  const metrics = [
    { label: t("overview.stat1Label"), value: "€84.2k", change: "+12.4%", icon: Landmark },
    { label: t("overview.stat2Label"), value: "128", change: "18 unpaid", icon: ReceiptText },
    { label: t("overview.stat4Label"), value: "342", change: "AI indexed", icon: FileText },
    { label: t("overview.stat3Label"), value: "24h", change: "Logged", icon: CalendarDays },
  ];

  const activity = [
    "VAT report is ready for review",
    "New supplier invoice imported",
    "Employment contract needs signature",
    "Claude summarized 14 documents",
  ];

  const invoices = [
    ["INV-2048", "ACME Logistics", "€2,840", "Due today"],
    ["INV-2049", "Northwind Foods", "€1,260", "Paid"],
    ["INV-2050", "Blue Field Ltd", "€5,470", "Draft"],
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-white/10 bg-navy/90 p-5 lg:border-b-0 lg:border-r">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigoElectric shadow-glow">
              <Building2 size={21} />
            </span>
            <span>
              <span className="block font-display text-2xl font-semibold tracking-tight">Officia</span>
              <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-indigo-200">{workspace.status === "ready" ? "active workspace" : "workspace preview"}</span>
            </span>
          </Link>

          <nav className="mt-8 grid gap-2">
            {navItems.map(({ label, icon: Icon, active, href }) => (
              <Link
                key={label}
                href={href}
                className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "bg-white text-navy shadow-lg"
                    : "text-slate-300 hover:bg-white/8 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon size={18} /> {label}
                </span>
                {active ? <ChevronRight size={16} /> : null}
              </Link>
            ))}
          </nav>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/8 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-400/20 text-indigo-100">
              <ShieldCheck size={22} />
            </div>
            <h2 className="mt-4 text-sm font-bold">Enterprise-ready base</h2>
            <p className="mt-2 text-xs leading-5 text-slate-300">
              Auth, billing, audit logs and role-based access are planned as the next product layer.
            </p>
          </div>

          <Link href="/pricing" className="mt-4 block rounded-3xl border border-indigo-300/20 bg-indigo-400/15 p-5 transition hover:bg-indigo-400/20">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-indigo-100">
              <CreditCard size={22} />
            </div>
            <h2 className="mt-4 text-sm font-bold">Billing preview</h2>
            <p className="mt-2 text-xs leading-5 text-slate-300">
              View subscription plans and Stripe checkout placeholder.
            </p>
          </Link>
        </aside>

        <section className="relative overflow-hidden bg-slate-50 text-slate-950">
          <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-indigo-500/15 blur-3xl" />
          <header className="relative flex flex-col gap-4 border-b border-slate-200/80 bg-white/70 px-6 py-5 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigoElectric">{t("nav.dashboard")}</p>
              <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-navy">{t("overview.greeting")}, {workspace.userName}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigoElectric">{workspace.workspaceName}</span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    workspace.status === "ready"
                      ? "bg-emerald-50 text-emerald-700"
                      : workspace.status === "error"
                        ? "bg-rose-50 text-rose-700"
                        : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {workspace.status === "ready" ? "Database connected" : workspace.status === "error" ? "Bootstrap error" : "Preview mode"}
                </span>
                <span className="text-xs font-semibold text-slate-500">{workspace.message}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm md:flex">
                <Search size={16} /> {t("header.searchPlaceholder")}
              </div>
              <LanguageSwitcher />
              <button type="button" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm">
                <Bell size={18} />
              </button>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                <UserButton />
              </div>
            </div>
          </header>

          <div className="relative px-6 py-8 lg:px-8">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {metrics.map(({ label, value, change, icon: Icon }) => (
                <article key={label} className="rounded-3xl border border-white bg-white/85 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-900/10">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
                      <p className="mt-3 text-3xl font-semibold text-navy">{value}</p>
                      <p className="mt-2 text-sm font-semibold text-indigoElectric">{change}</p>
                    </div>
                    <div className="rounded-2xl bg-indigo-50 p-3 text-indigoElectric">
                      <Icon size={22} />
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <article className="rounded-[2rem] border border-white bg-white/85 p-6 shadow-sm backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigoElectric">{t("overview.aiTitle")}</p>
                    <h2 className="mt-2 font-display text-2xl font-semibold text-navy">{t("overview.aiSubtitle")}</h2>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    <Sparkles size={14} /> Active preview
                  </span>
                </div>
                <div className="mt-5 rounded-3xl bg-navy p-5 text-white">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigoElectric">
                      <Bot size={21} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Officia AI</p>
                      <p className="text-xs text-slate-300">Connected to invoices, documents and HR context</p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3">
                    {[
                      t("overview.aiAction1"),
                      t("overview.aiAction2"),
                      t("overview.aiAction3"),
                    ].map((prompt) => (
                      <button key={prompt} type="button" className="rounded-2xl bg-white/8 px-4 py-3 text-left text-sm text-slate-100 transition hover:bg-white/12">
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </article>

              <article className="rounded-[2rem] border border-white bg-white/85 p-6 shadow-sm backdrop-blur">
                <h2 className="font-display text-2xl font-semibold text-navy">Today&apos;s activity</h2>
                <div className="mt-5 grid gap-3">
                  {activity.map((item) => (
                     <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-700">
                      <CheckCircle2 className="shrink-0 text-indigoElectric" size={18} /> {item}
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <article className="rounded-[2rem] border border-white bg-white/85 p-6 shadow-sm backdrop-blur">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-display text-2xl font-semibold text-navy">{t("overview.recentInvoicesTitle")}</h2>
                  <ReceiptText className="text-indigoElectric" size={22} />
                </div>
                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
                  {invoices.map(([id, client, amount, status]) => (
                    <div key={id} className="grid grid-cols-[0.8fr_1.3fr_0.8fr_0.8fr] gap-3 border-b border-slate-100 bg-white px-4 py-3 text-sm last:border-b-0">
                      <span className="font-bold text-navy">{id}</span>
                      <span className="text-slate-600">{client}</span>
                      <span className="font-bold text-slate-900">{amount}</span>
                      <span className="text-xs font-bold text-indigoElectric">{status}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-[2rem] border border-white bg-white/85 p-6 shadow-sm backdrop-blur">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-display text-2xl font-semibold text-navy">Document intelligence</h2>
                  <FileText className="text-indigoElectric" size={22} />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[
                    ["Contracts", "48", "6 need review"],
                    ["Receipts", "214", "AI extracted"],
                    ["HR files", "32", "4 expiring"],
                  ].map(([label, value, note]) => (
                    <div key={label} className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
                      <p className="mt-2 text-3xl font-semibold text-navy">{value}</p>
                      <p className="mt-1 text-xs font-bold text-indigoElectric">{note}</p>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

