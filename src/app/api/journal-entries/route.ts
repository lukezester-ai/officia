import { NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/db';
import { requireTenant } from '@/lib/auth/get-tenant';
import { requirePermission } from '@/lib/auth/rbac';
import { accountPlan } from '@/lib/db/schema/account_plan';
import { journalHeaders, journalLines } from '@/lib/db/schema/journal_entries';
import { auditLog } from '@/lib/db/schema/audit_log';
import { ensureStandardAccounts } from '@/lib/accounting/standard-accounts';

type InputLine = { account?: string; description?: string; debit?: string | number; credit?: string | number };
const amount = (value: unknown) => Math.round((Number(value) || 0) * 100);

export async function POST(req: Request) {
  try {
    const { tenantId, user } = await requireTenant();
    const gate = await requirePermission(tenantId, user.id, 'journal:create');
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const date = typeof body.date === 'string' ? body.date : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
    const inputLines: InputLine[] = Array.isArray(body.lines) ? body.lines.slice(0, 100) : [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !description) return NextResponse.json({ error: 'Дата и описание са задължителни.' }, { status: 400 });
    if (inputLines.length < 2) return NextResponse.json({ error: 'Необходими са поне два счетоводни реда.' }, { status: 400 });

    const normalized = inputLines.map((line) => ({
      account: String(line.account || '').trim(), description: String(line.description || '').trim(),
      debitCents: amount(line.debit), creditCents: amount(line.credit),
    }));
    if (normalized.some((line) => !line.account || line.debitCents < 0 || line.creditCents < 0 || (line.debitCents > 0 && line.creditCents > 0) || (line.debitCents === 0 && line.creditCents === 0))) {
      return NextResponse.json({ error: 'Всеки ред трябва да има сметка и сума само в дебит или само в кредит.' }, { status: 400 });
    }
    const debitCents = normalized.reduce((sum, line) => sum + line.debitCents, 0);
    const creditCents = normalized.reduce((sum, line) => sum + line.creditCents, 0);
    if (debitCents <= 0 || debitCents !== creditCents) return NextResponse.json({ error: 'Дебитът и кредитът трябва да са равни до стотинка.' }, { status: 400 });

    await ensureStandardAccounts(tenantId);
    const codes = [...new Set(normalized.map((line) => line.account))];
    const accounts = await db.select().from(accountPlan).where(and(eq(accountPlan.tenantId, tenantId), inArray(accountPlan.accountNumber, codes)));
    const accountMap = new Map(accounts.map((account) => [account.accountNumber, account.id]));
    const missing = codes.filter((code) => !accountMap.has(code));
    if (missing.length) return NextResponse.json({ error: `Липсващи сметки в сметкоплана: ${missing.join(', ')}` }, { status: 400 });

    const safeReference = reference.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 60);
    const journalNumber = `MAN-${tenantId.slice(0, 8)}-${safeReference || Date.now()}`;
    const [duplicate] = await db.select({ id: journalHeaders.id }).from(journalHeaders).where(eq(journalHeaders.journalNumber, journalNumber));
    if (duplicate) return NextResponse.json({ error: 'Референцията вече е използвана.' }, { status: 409 });

    const result = await db.transaction(async (tx) => {
      const [header] = await tx.insert(journalHeaders).values({
        tenantId, journalNumber, entryDate: new Date(`${date}T12:00:00.000Z`), description,
        documentType: 'manual', status: 'draft', aiStatus: 'needs_review',
      }).returning();
      await tx.insert(journalLines).values(normalized.map((line) => ({
        journalId: header.id,
        accountId: accountMap.get(line.account)!,
        entryType: line.debitCents > 0 ? 'debit' as const : 'credit' as const,
        amount: ((line.debitCents || line.creditCents) / 100).toFixed(2),
        description: line.description || description,
        currency: 'EUR',
      })));
      await tx.insert(auditLog).values({
        tenantId, userId: user.id, action: 'CREATE', tableName: 'journal_headers', recordId: header.id,
        newData: { journalNumber, date, description, debit: debitCents / 100, credit: creditCents / 100, lines: normalized.length },
        metadata: { source: 'manual_journal_api' },
      });
      return header;
    });
    return NextResponse.json({ success: true, id: result.id, journalNumber: result.journalNumber }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Грешка при записване на счетоводната статия';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
