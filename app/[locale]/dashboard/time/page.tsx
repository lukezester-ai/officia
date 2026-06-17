import { Link } from "@/i18n/routing";
import { ArrowLeft, CalendarClock, CheckCircle2, Clock3, MapPin, Plus, UserPlus, Users } from "lucide-react";
import { createEmployeeAction, createTimeEntryAction, createWorkScheduleAction } from "./actions";
import { getTimeDashboardState } from "@/lib/time/service";
import { bootstrapWorkspace } from "@/lib/workspaces/bootstrap";
import { getTranslations } from "next-intl/server";

const statusMessages: Record<string, string> = {
  "employee-created": "Employee created successfully.",
  "entry-created": "Time entry recorded successfully.",
  "schedule-created": "Work schedule created successfully.",
  "database-not-ready": "Database workspace is not ready yet.",
  "missing-employee": "Employee name is required.",
  "missing-time-entry": "Choose an employee and entry type.",
  "missing-schedule": "Choose an employee, day and working hours.",
  error: "Could not save the time tracking record.",
};

const entryTypeLabels = {
  check_in: "Check in",
  check_out: "Check out",
  break_start: "Break start",
  break_end: "Break end",
};

const dayLabels = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function TimeDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const workspace = await bootstrapWorkspace();
  const timeState = await getTimeDashboardState(workspace.workspaceId);
  const statusMessage = params?.status ? statusMessages[params.status] : null;
  const isErrorStatus = params?.status && !params.status.endsWith("created");
  const t = await getTranslations("Time");

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
            <p className="mt-2 text-sm font-semibold text-slate-500">{workspace.workspaceName} - {timeState.message}</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-indigo-50 px-4 py-3 text-sm font-bold text-indigoElectric">
            <Clock3 size={18} /> {timeState.entries.length} {t("recentEntries")}
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:px-8">
        {statusMessage ? (
          <div className={`rounded-2xl px-4 py-3 text-sm font-bold ${isErrorStatus ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
            {statusMessage}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-3">
          <article className="rounded-[2rem] border border-white bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigoElectric">
                <UserPlus size={22} />
              </div>
              <div>
                <h2 className="font-display text-2xl font-semibold text-navy">Add employee</h2>
                <p className="text-sm text-slate-500">Create the HR record used by time tracking.</p>
              </div>
            </div>
            <form action={createEmployeeAction} className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Full name
                <input name="fullName" required placeholder="Maria Petrova" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none ring-indigo-200 focus:ring-4" />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Email
                <input name="email" type="email" placeholder="maria@company.com" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none ring-indigo-200 focus:ring-4" />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Role
                <input name="roleTitle" placeholder="Accountant" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none ring-indigo-200 focus:ring-4" />
              </label>
              <button type="submit" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-indigoElectric px-5 text-sm font-bold text-white shadow-glow transition hover:bg-navy">
                <Plus size={16} /> Save employee
              </button>
            </form>
          </article>

          <article className="rounded-[2rem] border border-white bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigoElectric">
                <Clock3 size={22} />
              </div>
              <div>
                <h2 className="font-display text-2xl font-semibold text-navy">Clock event</h2>
                <p className="text-sm text-slate-500">Record check-in, check-out or break time.</p>
              </div>
            </div>
            <form action={createTimeEntryAction} className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                {t("employee")}
                <select name="employeeId" required className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none ring-indigo-200 focus:ring-4">
                  <option value="">Choose employee</option>
                  {timeState.employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>{employee.fullName}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Type
                <select name="type" defaultValue="check_in" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none ring-indigo-200 focus:ring-4">
                  {Object.entries(entryTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  Note
                  <input name="note" placeholder="Office" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none ring-indigo-200 focus:ring-4" />
                </label>
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  Location
                  <input name="location" placeholder="Sofia HQ / IP" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none ring-indigo-200 focus:ring-4" />
                </label>
              </div>
              <button type="submit" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-navy px-5 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition hover:bg-indigoElectric">
                <Clock3 size={16} /> Record event
              </button>
            </form>
          </article>

          <article className="rounded-[2rem] border border-white bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigoElectric">
                <CalendarClock size={22} />
              </div>
              <div>
                <h2 className="font-display text-2xl font-semibold text-navy">Work schedule</h2>
                <p className="text-sm text-slate-500">Assign regular working hours.</p>
              </div>
            </div>
            <form action={createWorkScheduleAction} className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                {t("employee")}
                <select name="employeeId" required className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none ring-indigo-200 focus:ring-4">
                  <option value="">Choose employee</option>
                  {timeState.employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>{employee.fullName}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Day
                <select name="dayOfWeek" defaultValue="monday" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none ring-indigo-200 focus:ring-4">
                  {Object.entries(dayLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  Start
                  <input name="startTime" type="time" required defaultValue="09:00" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none ring-indigo-200 focus:ring-4" />
                </label>
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  End
                  <input name="endTime" type="time" required defaultValue="17:30" className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none ring-indigo-200 focus:ring-4" />
                </label>
              </div>
              <button type="submit" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-indigoElectric px-5 text-sm font-bold text-white shadow-glow transition hover:bg-navy">
                <Plus size={16} /> Save schedule
              </button>
            </form>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
          <article className="rounded-[2rem] border border-white bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-semibold text-navy">Employees</h2>
              <Users className="text-indigoElectric" size={22} />
            </div>
            <div className="mt-5 grid gap-3">
              {timeState.employees.map((employee) => (
                <div key={employee.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-navy">{employee.fullName}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">{employee.roleTitle || "No role"}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">{employee.email || "No email"}</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{employee.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] border border-white bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-semibold text-navy">{t("recentEntries")}</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${timeState.status === "ready" ? "bg-emerald-50 text-emerald-700" : timeState.status === "error" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
                {timeState.status === "ready" ? "Live data" : timeState.status === "error" ? "Fallback data" : "Preview data"}
              </span>
            </div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
              {timeState.entries.map((entry) => (
                <div key={entry.id} className="grid gap-3 border-b border-slate-100 bg-white px-4 py-4 last:border-b-0 md:grid-cols-[1fr_0.8fr_0.8fr_1fr] md:items-center">
                  <div>
                    <p className="font-bold text-navy">{entry.employeeName}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-indigoElectric">{entryTypeLabels[entry.type]}</p>
                  </div>
                  <div className="text-sm font-semibold text-slate-600">{formatDateTime(entry.recordedAt)}</div>
                  <div className="text-sm text-slate-500">{entry.note || "No note"}</div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <MapPin size={15} className="text-indigoElectric" /> {entry.location || "No location"}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <article className="rounded-[2rem] border border-white bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold text-navy">Work schedules</h2>
            <CalendarClock className="text-indigoElectric" size={22} />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {timeState.schedules.map((schedule) => (
              <div key={schedule.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-navy">{schedule.employeeName}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{dayLabels[schedule.dayOfWeek]}</p>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigoElectric">{schedule.isActive ? "active" : "inactive"}</span>
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700">
                  <Clock3 size={16} className="text-indigoElectric" /> {schedule.startTime} - {schedule.endTime}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
            <CheckCircle2 className="text-indigoElectric" size={18} /> Next: employee self-service, approvals and monthly timesheet export.
          </div>
        </article>
      </section>
    </main>
  );
}

