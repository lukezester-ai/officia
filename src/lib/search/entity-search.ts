'use server';

import { db } from '@/lib/db/db';
import { counterparties } from '@/lib/db/schema/counterparties';
import { documents } from '@/lib/db/schema/documents';
import { employees } from '@/lib/db/schema/employees';
import { invoices } from '@/lib/db/schema/invoices';
import { requireTenant } from '@/lib/auth/get-tenant';
import { and, eq, ilike, or } from 'drizzle-orm';

export type EntitySearchResult = {
  id: string;
  kind: 'invoice' | 'counterparty' | 'employee' | 'document';
  label: string;
  subtitle: string;
  href: string;
};

const LIMIT = 5;

function likePattern(query: string) {
  return `%${query.trim()}%`;
}

export async function searchEntities(query: string): Promise<EntitySearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const { tenantId } = await requireTenant();
  const pattern = likePattern(trimmed);

  const [invoiceRows, counterpartyRows, employeeRows, documentRows] = await Promise.all([
    db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        clientName: invoices.clientName,
        counterpartyName: invoices.counterpartyName,
        totalAmount: invoices.totalAmount,
        status: invoices.status,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          or(
            ilike(invoices.invoiceNumber, pattern),
            ilike(invoices.clientName, pattern),
            ilike(invoices.counterpartyName, pattern),
          ),
        ),
      )
      .limit(LIMIT),
    db
      .select({
        id: counterparties.id,
        name: counterparties.name,
        eik: counterparties.eik,
        vatNumber: counterparties.vatNumber,
      })
      .from(counterparties)
      .where(
        and(
          eq(counterparties.tenantId, tenantId),
          or(
            ilike(counterparties.name, pattern),
            ilike(counterparties.eik, pattern),
            ilike(counterparties.vatNumber, pattern),
          ),
        ),
      )
      .limit(LIMIT),
    db
      .select({
        id: employees.id,
        firstName: employees.firstName,
        lastName: employees.lastName,
        email: employees.email,
        position: employees.position,
      })
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          or(
            ilike(employees.firstName, pattern),
            ilike(employees.lastName, pattern),
            ilike(employees.email, pattern),
          ),
        ),
      )
      .limit(LIMIT),
    db
      .select({
        id: documents.id,
        title: documents.title,
        type: documents.type,
        status: documents.status,
      })
      .from(documents)
      .where(and(eq(documents.tenantId, tenantId), ilike(documents.title, pattern)))
      .limit(LIMIT),
  ]);

  const results: EntitySearchResult[] = [];

  for (const invoice of invoiceRows) {
    const name = invoice.clientName || invoice.counterpartyName || 'Без контрагент';
    results.push({
      id: `invoice-${invoice.id}`,
      kind: 'invoice',
      label: invoice.invoiceNumber ? `Фактура ${invoice.invoiceNumber}` : `Фактура #${invoice.id}`,
      subtitle: `${name} · ${invoice.totalAmount ?? '0'} € · ${invoice.status ?? '—'}`,
      href: `/dashboard/invoices?open=${invoice.id}`,
    });
  }

  for (const counterparty of counterpartyRows) {
    results.push({
      id: `counterparty-${counterparty.id}`,
      kind: 'counterparty',
      label: counterparty.name,
      subtitle: [counterparty.eik, counterparty.vatNumber].filter(Boolean).join(' · ') || 'Контрагент',
      href: `/dashboard/counterparties/${counterparty.id}`,
    });
  }

  for (const employee of employeeRows) {
    results.push({
      id: `employee-${employee.id}`,
      kind: 'employee',
      label: `${employee.firstName} ${employee.lastName}`.trim(),
      subtitle: [employee.position, employee.email].filter(Boolean).join(' · ') || 'Служител',
      href: `/dashboard/hr/${employee.id}`,
    });
  }

  for (const document of documentRows) {
    results.push({
      id: `document-${document.id}`,
      kind: 'document',
      label: document.title,
      subtitle: [document.type, document.status].filter(Boolean).join(' · ') || 'Документ',
      href: `/dashboard/documents`,
    });
  }

  return results.slice(0, 12);
}
