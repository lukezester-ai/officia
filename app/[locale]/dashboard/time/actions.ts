"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { employees, timeEntries, workSchedules } from "@/lib/db/schema";
import { bootstrapWorkspace } from "@/lib/workspaces/bootstrap";
import { getLocale } from "next-intl/server";

const entryTypes = ["check_in", "check_out", "break_start", "break_end"] as const;
const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

function redirectWith(locale: string, status: string): never {
  redirect(`/${locale}/dashboard/time?status=${status}`);
}

export async function createEmployeeAction(formData: FormData) {
  const locale = await getLocale();
  const workspace = await bootstrapWorkspace();

  if (!db || workspace.status !== "ready" || !workspace.workspaceId) {
    redirectWith(locale, "database-not-ready");
  }

  const database = db;
  const workspaceId = workspace.workspaceId;
  const fullName = String(formData.get("fullName") || "").trim();
  const email = String(formData.get("email") || "").trim() || null;
  const roleTitle = String(formData.get("roleTitle") || "").trim() || null;

  if (!fullName) {
    redirectWith(locale, "missing-employee");
  }

  try {
    await database.insert(employees).values({
      workspaceId,
      fullName,
      email,
      roleTitle,
      status: "active",
    });

    revalidatePath(`/${locale}/dashboard/time`);
    redirectWith(locale, "employee-created");
  } catch (error) {
    console.error("Failed to create employee:", error);
    redirectWith(locale, "error");
  }
}

export async function createTimeEntryAction(formData: FormData) {
  const locale = await getLocale();
  const workspace = await bootstrapWorkspace();

  if (!db || workspace.status !== "ready" || !workspace.workspaceId) {
    redirectWith(locale, "database-not-ready");
  }

  const database = db;
  const employeeId = String(formData.get("employeeId") || "").trim();
  const type = String(formData.get("type") || "").trim();
  const note = String(formData.get("note") || "").trim() || null;
  const location = String(formData.get("location") || "").trim() || null;

  if (!employeeId || !entryTypes.includes(type as (typeof entryTypes)[number])) {
    redirectWith(locale, "missing-time-entry");
  }

  try {
    await database.insert(timeEntries).values({
      employeeId,
      type: type as (typeof entryTypes)[number],
      note,
      location,
    });

    revalidatePath(`/${locale}/dashboard/time`);
    redirectWith(locale, "entry-created");
  } catch (error) {
    console.error("Failed to create time entry:", error);
    redirectWith(locale, "error");
  }
}

export async function createWorkScheduleAction(formData: FormData) {
  const locale = await getLocale();
  const workspace = await bootstrapWorkspace();

  if (!db || workspace.status !== "ready" || !workspace.workspaceId) {
    redirectWith(locale, "database-not-ready");
  }

  const database = db;
  const employeeId = String(formData.get("employeeId") || "").trim();
  const dayOfWeek = String(formData.get("dayOfWeek") || "").trim();
  const startTime = String(formData.get("startTime") || "").trim();
  const endTime = String(formData.get("endTime") || "").trim();

  if (!employeeId || !daysOfWeek.includes(dayOfWeek as (typeof daysOfWeek)[number]) || !startTime || !endTime) {
    redirectWith(locale, "missing-schedule");
  }

  try {
    await database.insert(workSchedules).values({
      employeeId,
      dayOfWeek: dayOfWeek as (typeof daysOfWeek)[number],
      startTime,
      endTime,
      isActive: true,
    });

    revalidatePath(`/${locale}/dashboard/time`);
    redirectWith(locale, "schedule-created");
  } catch (error) {
    console.error("Failed to create work schedule:", error);
    redirectWith(locale, "error");
  }
}
