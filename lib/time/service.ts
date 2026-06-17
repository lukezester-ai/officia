import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { employees, timeEntries, workSchedules } from "@/lib/db/schema";

export type TimeDashboardState = {
  status: "ready" | "preview" | "error";
  message: string;
  employees: Array<{
    id: string;
    fullName: string;
    email: string | null;
    roleTitle: string | null;
    status: "active" | "on_leave" | "inactive";
  }>;
  entries: Array<{
    id: string;
    employeeName: string;
    type: "check_in" | "check_out" | "break_start" | "break_end";
    recordedAt: Date;
    note: string | null;
    location: string | null;
  }>;
  schedules: Array<{
    id: string;
    employeeName: string;
    dayOfWeek: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
    startTime: string;
    endTime: string;
    isActive: boolean;
  }>;
};

const previewEmployees: TimeDashboardState["employees"] = [
  { id: "preview-employee-1", fullName: "Maria Petrova", email: "maria@officia.example", roleTitle: "Accountant", status: "active" },
  { id: "preview-employee-2", fullName: "Ivan Georgiev", email: "ivan@officia.example", roleTitle: "Office Manager", status: "active" },
];

const previewEntries: TimeDashboardState["entries"] = [
  { id: "preview-entry-1", employeeName: "Maria Petrova", type: "check_in", recordedAt: new Date("2026-06-14T06:58:00.000Z"), note: "Office", location: "Sofia HQ" },
  { id: "preview-entry-2", employeeName: "Ivan Georgiev", type: "break_start", recordedAt: new Date("2026-06-14T09:30:00.000Z"), note: "Lunch", location: "Sofia HQ" },
];

const previewSchedules: TimeDashboardState["schedules"] = [
  { id: "preview-schedule-1", employeeName: "Maria Petrova", dayOfWeek: "monday", startTime: "09:00", endTime: "17:30", isActive: true },
  { id: "preview-schedule-2", employeeName: "Ivan Georgiev", dayOfWeek: "tuesday", startTime: "10:00", endTime: "18:00", isActive: true },
];

export async function getTimeDashboardState(workspaceId: string | null): Promise<TimeDashboardState> {
  if (!workspaceId || !db) {
    return {
      status: "preview",
      message: "Time tracking runs in preview mode until DATABASE_URL and workspace bootstrap are ready.",
      employees: previewEmployees,
      entries: previewEntries,
      schedules: previewSchedules,
    };
  }

  try {
    const employeeRows = await db
      .select({
        id: employees.id,
        fullName: employees.fullName,
        email: employees.email,
        roleTitle: employees.roleTitle,
        status: employees.status,
      })
      .from(employees)
      .where(eq(employees.workspaceId, workspaceId))
      .orderBy(desc(employees.createdAt));

    const entryRows = await db
      .select({
        id: timeEntries.id,
        employeeName: employees.fullName,
        type: timeEntries.type,
        recordedAt: timeEntries.recordedAt,
        note: timeEntries.note,
        location: timeEntries.location,
      })
      .from(timeEntries)
      .innerJoin(employees, eq(timeEntries.employeeId, employees.id))
      .where(eq(employees.workspaceId, workspaceId))
      .orderBy(desc(timeEntries.recordedAt))
      .limit(20);

    const scheduleRows = await db
      .select({
        id: workSchedules.id,
        employeeName: employees.fullName,
        dayOfWeek: workSchedules.dayOfWeek,
        startTime: workSchedules.startTime,
        endTime: workSchedules.endTime,
        isActive: workSchedules.isActive,
      })
      .from(workSchedules)
      .innerJoin(employees, eq(workSchedules.employeeId, employees.id))
      .where(eq(employees.workspaceId, workspaceId))
      .orderBy(desc(workSchedules.createdAt))
      .limit(20);

    return {
      status: "ready",
      message: employeeRows.length ? "Loaded from Supabase." : "Create the first employee to start tracking time.",
      employees: employeeRows,
      entries: entryRows,
      schedules: scheduleRows,
    };
  } catch (error) {
    console.error("Failed to load time dashboard:", error);
    return {
      status: "error",
      message: "Could not load time tracking data. Check DATABASE_URL and run supabase-app-schema.sql.",
      employees: previewEmployees,
      entries: previewEntries,
      schedules: previewSchedules,
    };
  }
}
