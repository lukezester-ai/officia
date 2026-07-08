'use server';

import { db } from '@/lib/db/db';
import { employees } from '@/lib/db/schema/employees';
import { employmentContracts } from '@/lib/db/schema/employment_contracts';
import { leaveRequests } from '@/lib/db/schema/leave_requests';
import { auditLog } from '@/lib/db/schema/audit_log';
import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireTenant } from '@/lib/auth/get-tenant';
import { requirePermission } from '@/lib/auth/rbac';
import { encryptSensitive, hashSensitive, normalizePersonalIdentifier } from '@/lib/security/sensitive-data';

type ContractKind = 'permanent' | 'fixed_term' | 'civil_contract';

export type EmployeeInput = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  personalIdentifier?: string;
  position?: string;
  department?: string;
  salary?: string | number;
  bankIban?: string;
  bankName?: string;
  startDate?: string;
  contractNumber?: string;
  contractKind?: ContractKind;
  contractDate?: string;
  contractEndDate?: string;
};

async function context(permission = 'employee:read') {
  const ctx = await requireTenant();
  const gate = await requirePermission(ctx.tenantId, ctx.user.id, permission);
  if (!gate.ok) throw new Error(gate.error);
  return ctx;
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
}

export async function getHrData() {
  try {
    const { tenantId } = await context();
    const [allEmployees, contracts] = await Promise.all([
      db.select().from(employees).where(eq(employees.tenantId, tenantId)).orderBy(desc(employees.startDate)),
      db.select().from(employmentContracts).where(eq(employmentContracts.tenantId, tenantId)).orderBy(desc(employmentContracts.startDate)),
    ]);
    const activeContractEmployees = new Set(contracts.filter((contract) => contract.status === 'active').map((contract) => contract.employeeId));
    const alerts = allEmployees.flatMap((employee) => {
      const issues: Array<{ employeeId: string; name: string; issue: string }> = [];
      const name = `${employee.firstName} ${employee.lastName}`.trim();
      if (employee.isActive && !activeContractEmployees.has(employee.id)) issues.push({ employeeId: employee.id, name, issue: 'Няма въведен активен трудов договор.' });
      if (!employee.salary || Number(employee.salary) <= 0) issues.push({ employeeId: employee.id, name, issue: 'Липсва основна заплата.' });
      if (employee.aiStatus) issues.push({ employeeId: employee.id, name, issue: employee.aiStatus });
      return issues;
    });
    return { success: true as const, data: { employees: allEmployees, alerts } };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Грешка при зареждане на служителите' };
  }
}

export async function getEmployeeProfile(employeeId: string) {
  try {
    const { tenantId } = await context();
    const [employee] = await db.select().from(employees).where(and(eq(employees.id, employeeId), eq(employees.tenantId, tenantId)));
    if (!employee) return { success: false as const, error: 'Служителят не е намерен.' };
    const [contracts, leaves, history] = await Promise.all([
      db.select().from(employmentContracts).where(and(eq(employmentContracts.employeeId, employeeId), eq(employmentContracts.tenantId, tenantId))).orderBy(desc(employmentContracts.startDate)),
      db.select().from(leaveRequests).where(and(eq(leaveRequests.employeeId, employeeId), eq(leaveRequests.tenantId, tenantId))).orderBy(desc(leaveRequests.startDate)),
      db.select().from(auditLog).where(and(eq(auditLog.recordId, employeeId), eq(auditLog.tenantId, tenantId))).orderBy(desc(auditLog.createdAt)).limit(50),
    ]);
    return { success: true as const, data: { employee, contracts, leaves, history } };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Грешка при зареждане на профила' };
  }
}

export async function createEmployee(data: EmployeeInput) {
  try {
    const { tenantId, user } = await context('employee:*');
    const { firstName, lastName } = splitName(data.name);
    if (!firstName || !lastName) return { success: false as const, error: 'Въведете поне две имена.' };
    if (!data.position?.trim()) return { success: false as const, error: 'Длъжността е задължителна.' };
    const position = data.position.trim();
    const identifier = data.personalIdentifier ? normalizePersonalIdentifier(data.personalIdentifier) : null;
    const startDate = data.startDate || new Date().toISOString().slice(0, 10);

    const employeeId = await db.transaction(async (tx) => {
      const [employee] = await tx.insert(employees).values({
        tenantId,
        userId: null,
        firstName,
        lastName,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        personalIdentifierEncrypted: identifier ? encryptSensitive(identifier) : null,
        personalIdentifierHash: identifier ? hashSensitive(identifier, tenantId) : null,
        bankIbanEncrypted: data.bankIban?.trim() ? encryptSensitive(data.bankIban.trim().replace(/\s+/g, '').toUpperCase()) : null,
        bankName: data.bankName?.trim() || null,
        position,
        department: data.department?.trim() || null,
        salary: data.salary ? Number(data.salary).toFixed(2) : null,
        contractType: data.contractKind === 'civil_contract' ? 'contractor' : 'full_time',
        startDate,
        endDate: data.contractEndDate || null,
        isActive: true,
        workStatus: 'at_work',
      }).returning();

      if (data.contractNumber?.trim()) {
        await tx.insert(employmentContracts).values({
          tenantId,
          employeeId: employee.id,
          contractNumber: data.contractNumber.trim(),
          kind: data.contractKind ?? 'permanent',
          contractDate: data.contractDate || startDate,
          startDate,
          endDate: data.contractEndDate || null,
          status: 'active',
          createdBy: user.id,
        });
      }
      await tx.insert(auditLog).values({
        tenantId, userId: user.id, action: 'CREATE', tableName: 'employees', recordId: employee.id,
        newData: { firstName, lastName, position, department: data.department, startDate, hasPersonalIdentifier: Boolean(identifier), hasBankIban: Boolean(data.bankIban) },
        metadata: { source: 'hr_ui' },
      });
      return employee.id;
    });
    revalidatePath('/bg/dashboard/hr');
    return { success: true as const, employeeId };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Грешка при добавяне на служител';
    return { success: false as const, error: message.includes('employees_tenant_personal_identifier_idx') ? 'Вече има служител с този идентификатор във фирмата.' : message };
  }
}

export async function updateEmployee(employeeId: string, data: EmployeeInput) {
  try {
    const { tenantId, user } = await context('employee:*');
    const [existing] = await db.select().from(employees).where(and(eq(employees.id, employeeId), eq(employees.tenantId, tenantId)));
    if (!existing) return { success: false as const, error: 'Служителят не е намерен.' };
    const { firstName, lastName } = splitName(data.name);
    const identifier = data.personalIdentifier ? normalizePersonalIdentifier(data.personalIdentifier) : null;
    const changes = {
      firstName, lastName,
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      address: data.address?.trim() || null,
      position: data.position?.trim() || null,
      department: data.department?.trim() || null,
      salary: data.salary ? Number(data.salary).toFixed(2) : null,
      bankName: data.bankName?.trim() || null,
      ...(identifier ? { personalIdentifierEncrypted: encryptSensitive(identifier), personalIdentifierHash: hashSensitive(identifier, tenantId) } : {}),
      ...(data.bankIban?.trim() ? { bankIbanEncrypted: encryptSensitive(data.bankIban.trim().replace(/\s+/g, '').toUpperCase()) } : {}),
      updatedAt: new Date(),
    };
    await db.transaction(async (tx) => {
      await tx.update(employees).set(changes).where(and(eq(employees.id, employeeId), eq(employees.tenantId, tenantId)));
      await tx.insert(auditLog).values({
        tenantId, userId: user.id, action: 'UPDATE', tableName: 'employees', recordId: employeeId,
        oldData: { firstName: existing.firstName, lastName: existing.lastName, email: existing.email, phone: existing.phone, position: existing.position, department: existing.department, salary: existing.salary },
        newData: { firstName, lastName, email: changes.email, phone: changes.phone, position: changes.position, department: changes.department, salary: changes.salary, sensitiveFieldsUpdated: Boolean(identifier || data.bankIban) },
        metadata: { source: 'hr_ui' },
      });
    });
    revalidatePath('/bg/dashboard/hr');
    revalidatePath(`/bg/dashboard/hr/${employeeId}`);
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Грешка при редакция на служител' };
  }
}

export async function createEmploymentContract(employeeId: string, data: { contractNumber: string; kind: ContractKind; contractDate: string; startDate: string; endDate?: string }) {
  try {
    const { tenantId, user } = await context('employee:*');
    const [employee] = await db.select({ id: employees.id }).from(employees).where(and(eq(employees.id, employeeId), eq(employees.tenantId, tenantId)));
    if (!employee) return { success: false as const, error: 'Служителят не е намерен.' };
    const [contract] = await db.insert(employmentContracts).values({
      tenantId, employeeId, contractNumber: data.contractNumber.trim(), kind: data.kind,
      contractDate: data.contractDate, startDate: data.startDate, endDate: data.endDate || null,
      status: 'active', createdBy: user.id,
    }).returning();
    await db.insert(auditLog).values({
      tenantId, userId: user.id, action: 'CREATE', tableName: 'employment_contracts', recordId: contract.id,
      newData: { employeeId, contractNumber: data.contractNumber, kind: data.kind, startDate: data.startDate, endDate: data.endDate },
      metadata: { source: 'hr_ui' },
    });
    revalidatePath(`/bg/dashboard/hr/${employeeId}`);
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Грешка при създаване на договор' };
  }
}

export async function createLeaveRequest(data: {
  employeeId: string; type: 'annual' | 'sick' | 'unpaid' | 'maternity' | 'parental' | 'other';
  startDate: string; endDate: string; reason?: string;
}) {
  try {
    const { tenantId, userId } = await context('employee:*');
    const [employee] = await db.select({ id: employees.id, workStatus: employees.workStatus }).from(employees).where(and(eq(employees.id, data.employeeId), eq(employees.tenantId, tenantId)));
    if (!employee) return { success: false as const, error: 'Служителят не е намерен.' };

    const daysRequested = Math.floor((new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / 86400000) + 1;
    if (daysRequested < 1) return { success: false as const, error: 'Невалиден период.' };

    const [leave] = await db.insert(leaveRequests).values({
      tenantId, employeeId: data.employeeId, startDate: data.startDate, endDate: data.endDate,
      type: data.type, daysRequested, reason: data.reason || null,
      status: 'pending', approvedBy: null,
    }).returning();

    if (data.type === 'sick') {
      await db.update(employees).set({ workStatus: 'sick_leave', updatedAt: new Date() }).where(eq(employees.id, data.employeeId));
    } else if (data.type === 'unpaid') {
      await db.update(employees).set({ workStatus: 'unpaid_leave', updatedAt: new Date() }).where(eq(employees.id, data.employeeId));
    }

    await db.insert(auditLog).values({
      tenantId, userId, action: 'CREATE', tableName: 'leave_requests', recordId: leave.id,
      newData: { employeeId: data.employeeId, type: data.type, startDate: data.startDate, endDate: data.endDate, daysRequested },
      metadata: { source: 'hr_ui' },
    });

    revalidatePath('/bg/dashboard/hr');
    return { success: true as const, leaveId: leave.id };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Грешка при създаване на отпуск' };
  }
}

export async function approveLeaveRequest(leaveId: string) {
  try {
    const { tenantId, userId } = await context('employee:*');
    const [leave] = await db.select().from(leaveRequests).where(and(eq(leaveRequests.id, leaveId), eq(leaveRequests.tenantId, tenantId)));
    if (!leave) return { success: false as const, error: 'Заявката не е намерена.' };
    if (leave.status !== 'pending') return { success: false as const, error: 'Заявката вече е обработена.' };

    await db.update(leaveRequests).set({ status: 'approved', approvedBy: userId, updatedAt: new Date() }).where(eq(leaveRequests.id, leaveId));

    if (leave.type === 'annual' || leave.type === 'parental' || leave.type === 'maternity') {
      await db.update(employees).set({ workStatus: 'on_leave', updatedAt: new Date() }).where(eq(employees.id, leave.employeeId));
    }

    await db.insert(auditLog).values({
      tenantId, userId, action: 'UPDATE', tableName: 'leave_requests', recordId: leaveId,
      oldData: { status: 'pending' }, newData: { status: 'approved' }, metadata: { source: 'hr_approval' },
    });

    revalidatePath('/bg/dashboard/hr');
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Грешка при одобрение' };
  }
}

export async function rejectLeaveRequest(leaveId: string) {
  try {
    const { tenantId, userId } = await context('employee:*');
    const [leave] = await db.select().from(leaveRequests).where(and(eq(leaveRequests.id, leaveId), eq(leaveRequests.tenantId, tenantId)));
    if (!leave) return { success: false as const, error: 'Заявката не е намерена.' };
    if (leave.status !== 'pending') return { success: false as const, error: 'Заявката вече е обработена.' };

    await db.update(leaveRequests).set({ status: 'rejected', approvedBy: userId, updatedAt: new Date() }).where(eq(leaveRequests.id, leaveId));

    if (leave.type === 'sick') {
      await db.update(employees).set({ workStatus: 'at_work', updatedAt: new Date() }).where(eq(employees.id, leave.employeeId));
    } else if (leave.type === 'unpaid') {
      await db.update(employees).set({ workStatus: 'at_work', updatedAt: new Date() }).where(eq(employees.id, leave.employeeId));
    }

    await db.insert(auditLog).values({
      tenantId, userId, action: 'UPDATE', tableName: 'leave_requests', recordId: leaveId,
      oldData: { status: 'pending' }, newData: { status: 'rejected' }, metadata: { source: 'hr_approval' },
    });

    revalidatePath('/bg/dashboard/hr');
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Грешка при отказ' };
  }
}

export async function getPendingLeaveRequests() {
  try {
    const { tenantId } = await context('employee:read');
    const rows = await db
      .select({
        id: leaveRequests.id, employeeId: leaveRequests.employeeId, type: leaveRequests.type,
        startDate: leaveRequests.startDate, endDate: leaveRequests.endDate, daysRequested: leaveRequests.daysRequested,
        reason: leaveRequests.reason, status: leaveRequests.status, createdAt: leaveRequests.createdAt,
        employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
        employeePosition: employees.position,
      })
      .from(leaveRequests)
      .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .where(and(eq(leaveRequests.tenantId, tenantId), eq(leaveRequests.status, 'pending')))
      .orderBy(desc(leaveRequests.createdAt));
    return { success: true as const, data: rows };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Грешка при зареждане на заявки' };
  }
}

export async function getLeaveBalance(employeeId: string) {
  try {
    const { tenantId } = await context('employee:read');
    const year = new Date().getFullYear();
    const startOfYear = `${year}-01-01`;
    const endOfYear = `${year}-12-31`;

    const usedAnnual = await db
      .select({ total: sql<number>`COALESCE(SUM(${leaveRequests.daysRequested}), 0)` })
      .from(leaveRequests)
      .where(and(
        eq(leaveRequests.tenantId, tenantId), eq(leaveRequests.employeeId, employeeId),
        eq(leaveRequests.type, 'annual'), eq(leaveRequests.status, 'approved'),
        gte(leaveRequests.startDate, startOfYear), lte(leaveRequests.startDate, endOfYear),
      ));

    const usedSick = await db
      .select({ total: sql<number>`COALESCE(SUM(${leaveRequests.daysRequested}), 0)` })
      .from(leaveRequests)
      .where(and(
        eq(leaveRequests.tenantId, tenantId), eq(leaveRequests.employeeId, employeeId),
        eq(leaveRequests.type, 'sick'), eq(leaveRequests.status, 'approved'),
        gte(leaveRequests.startDate, startOfYear), lte(leaveRequests.startDate, endOfYear),
      ));

    const annualEntitlement = 20;
    const used = Number(usedAnnual[0]?.total || 0);
    const sickUsed = Number(usedSick[0]?.total || 0);
    const remaining = Math.max(0, annualEntitlement - used);

    return { success: true as const, data: { annualEntitlement, used, remaining, sickUsed } };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Грешка при изчисление на баланс' };
  }
}

export async function updateEmployeeStatus(id: string, newStatus: string) {
  try {
    const { tenantId, user } = await context('employee:*');
    const allowed = ['at_work', 'on_leave', 'sick_leave', 'unpaid_leave'];
    if (!allowed.includes(newStatus)) return { success: false as const, error: 'Невалиден статус.' };
    const [existing] = await db.select({ workStatus: employees.workStatus }).from(employees).where(and(eq(employees.id, id), eq(employees.tenantId, tenantId)));
    if (!existing) return { success: false as const, error: 'Служителят не е намерен.' };
    await db.transaction(async (tx) => {
      await tx.update(employees).set({ workStatus: newStatus, updatedAt: new Date() }).where(and(eq(employees.id, id), eq(employees.tenantId, tenantId)));
      await tx.insert(auditLog).values({ tenantId, userId: user.id, action: 'UPDATE', tableName: 'employees', recordId: id, oldData: { workStatus: existing.workStatus }, newData: { workStatus: newStatus }, metadata: { source: 'hr_status' } });
    });
    revalidatePath('/bg/dashboard/hr');
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Грешка при промяна на статуса' };
  }
}
