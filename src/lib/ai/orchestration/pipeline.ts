// @ts-nocheck
import { randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/db';
import { aiAgentRuns } from '@/lib/db/schema/ai_agent_runs';
import { aiInboxItems } from '@/lib/db/schema/ai_inbox';
import { documents } from '@/lib/db/schema/documents';
import { purchaseInvoices, purchaseInvoiceLines } from '@/lib/db/schema/purchase-invoices';
import { bankTransactions } from '@/lib/db/schema/bank_transactions';
import { bankAccounts } from '@/lib/db/schema/bank_accounts';
import { invoices } from '@/lib/db/schema/invoices';
import { queueAiApprovalRequest } from '@/lib/ai/automation/approval-queue';
import { matchTransactionWithAI } from '@/lib/ai/agents/matcher';
import { publishAiEvent } from './events';
import { runInventoryFromPurchaseDraft } from './inventory-pipeline';
import type { PipelineName, PipelineStep } from './types';

async function upsertRun(input: {
  id?: string;
  tenantId: string;
  correlationId: string;
  pipeline: PipelineName;
  status: string;
  currentStep?: string;
  stepsCompleted?: number;
  stepsTotal?: number;
  sourceType?: string;
  sourceId?: string;
  summary?: string;
  metaJson?: unknown;
}) {
  try {
    if (input.id) {
      const [row] = await db
        .update(aiAgentRuns)
        .set({
          status: input.status,
          currentStep: input.currentStep,
          stepsCompleted: input.stepsCompleted,
          stepsTotal: input.stepsTotal,
          summary: input.summary,
          metaJson: input.metaJson,
          updatedAt: new Date(),
        })
        .where(eq(aiAgentRuns.id, input.id))
        .returning();
      return row;
    }

    const [row] = await db
      .insert(aiAgentRuns)
      .values({
        tenantId: input.tenantId,
        correlationId: input.correlationId,
        pipeline: input.pipeline,
        status: input.status,
        currentStep: input.currentStep,
        stepsCompleted: input.stepsCompleted ?? 0,
        stepsTotal: input.stepsTotal ?? 0,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        summary: input.summary,
        metaJson: input.metaJson,
      })
      .returning();
    return row;
  } catch (err) {
    // Table may not exist yet in some environments — pipeline still returns in-memory result
    console.warn('[pipeline] ai_agent_runs write skipped:', (err as Error)?.message);
    return { id: input.id || randomUUID(), ...input };
  }
}

/**
 * Document lifecycle pipeline:
 * OCR data → purchase invoice draft → journal proposal (approval) → bank match attempt → inbox summary
 */
export async function runDocumentLifecyclePipeline(input: {
  tenantId: string;
  userId?: string | null;
  documentId?: string;
  ocr: {
    totalAmount?: number;
    currency?: string;
    invoiceNumber?: string;
    date?: string;
    counterpartyName?: string;
    extractedText?: string;
    lineItems?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
      itemType?: string;
    }>;
  };
  correlationId?: string;
}) {
  const correlationId = input.correlationId || randomUUID();
  const steps: PipelineStep[] = [
    { key: 'persist_ocr', domain: 'documents', label: 'Запис на OCR данни', status: 'pending' },
    { key: 'draft_purchase', domain: 'accounting', label: 'Чернова покупна фактура', status: 'pending' },
    { key: 'inventory_stock', domain: 'inventory', label: 'Заскладяване на стоки', status: 'pending' },
    { key: 'propose_journal', domain: 'accounting', label: 'Предложение за контировка', status: 'pending', requiresHumanReview: true },
    { key: 'bank_match', domain: 'banking', label: 'Опит за банково съпоставяне', status: 'pending' },
    { key: 'inbox_notify', domain: 'orchestrator', label: 'Известие в AI Inbox', status: 'pending' },
  ];

  const run = await upsertRun({
    tenantId: input.tenantId,
    correlationId,
    pipeline: 'document_lifecycle',
    status: 'running',
    currentStep: 'persist_ocr',
    stepsTotal: steps.length,
    sourceType: 'document',
    sourceId: input.documentId,
    summary: 'Document lifecycle started',
  });

  const ocr = input.ocr;
  const total = Number(ocr.totalAmount || 0);
  const net = total / 1.2;
  const vat = total - net;
  let purchaseInvoiceId: string | null = null;

  // Step 1 — persist OCR onto document
  steps[0].status = 'running';
  try {
    if (input.documentId) {
      await db
        .update(documents)
        .set({
          contentExtracted: ocr.extractedText || null,
          aiStatus: 'processed',
          aiSummary: `${ocr.counterpartyName || 'Контрагент'} · ${total.toFixed(2)} ${ocr.currency || 'EUR'} · №${ocr.invoiceNumber || '—'}`,
          status: 'analyzed',
          metadata: {
            ...(typeof ocr === 'object' ? ocr : {}),
            correlationId,
            pipeline: 'document_lifecycle',
          },
        })
        .where(and(eq(documents.id, input.documentId), eq(documents.tenantId, input.tenantId)));
    }
    steps[0].status = 'completed';
    steps[0].result = { documentId: input.documentId };
  } catch (err: any) {
    steps[0].status = 'failed';
    steps[0].error = err.message;
  }

  await publishAiEvent({
    type: 'document.ocr_completed',
    tenantId: input.tenantId,
    userId: input.userId,
    correlationId,
    sourceType: 'document',
    sourceId: input.documentId,
    message: `OCR готов: ${ocr.counterpartyName || 'документ'} ${total.toFixed(2)} ${ocr.currency || 'EUR'}`,
    payload: { invoiceNumber: ocr.invoiceNumber, total },
  });

  // Step 2 — draft purchase invoice
  steps[1].status = 'running';
  try {
    purchaseInvoiceId = randomUUID();
    await db.insert(purchaseInvoices).values({
      id: purchaseInvoiceId,
      tenantId: input.tenantId,
      invoiceNumber: ocr.invoiceNumber || `AI-${Date.now().toString().slice(-6)}`,
      issueDate: ocr.date && ocr.date !== 'Unknown' ? ocr.date : new Date().toISOString().slice(0, 10),
      dueDate: ocr.date && ocr.date !== 'Unknown' ? ocr.date : new Date().toISOString().slice(0, 10),
      supplierName: ocr.counterpartyName || 'Неизвестен доставчик',
      status: 'draft',
      netAmount: net.toFixed(2),
      vatAmount: vat.toFixed(2),
      totalAmount: total.toFixed(2),
      notes: `Автоматично създадена от AI pipeline (${correlationId.slice(0, 8)})`,
    });

    const lines = (ocr.lineItems || []).length
      ? ocr.lineItems!
      : [{ description: ocr.extractedText?.slice(0, 120) || 'Стоки/услуги от документ', quantity: 1, unitPrice: net, total: net }];

    await db.insert(purchaseInvoiceLines).values(
      lines.map((line, idx) => {
        const lineNet = Number(line.total ?? line.unitPrice * (line.quantity || 1));
        const lineVat = lineNet * 0.2;
        return {
          id: randomUUID(),
          invoiceId: purchaseInvoiceId!,
          description: line.description || `Ред ${idx + 1}`,
          quantity: String(line.quantity || 1),
          unitPrice: String(line.unitPrice || lineNet),
          vatRate: 20,
          lineNet: lineNet.toFixed(2),
          lineVat: lineVat.toFixed(2),
          lineTotal: (lineNet + lineVat).toFixed(2),
          lineOrder: idx,
        };
      }),
    );

    steps[1].status = 'completed';
    steps[1].result = { purchaseInvoiceId };
    await publishAiEvent({
      type: 'document.draft_created',
      tenantId: input.tenantId,
      userId: input.userId,
      correlationId,
      sourceType: 'purchase_invoice',
      sourceId: purchaseInvoiceId,
      message: `Чернова покупна фактура ${ocr.invoiceNumber || purchaseInvoiceId.slice(0, 8)}`,
      payload: { purchaseInvoiceId, total },
    });
  } catch (err: any) {
    steps[1].status = 'failed';
    steps[1].error = err.message;
  }

  // Step 3 — warehouse stock for goods lines
  steps[2].status = 'running';
  try {
    if (purchaseInvoiceId) {
      const stockResult = await runInventoryFromPurchaseDraft({
        tenantId: input.tenantId,
        userId: input.userId,
        purchaseInvoiceId,
        lineItems: ocr.lineItems || [],
      });
      steps[2].status = stockResult.movementsAdded > 0 ? 'completed' : 'skipped';
      steps[2].result = stockResult;
    } else {
      steps[2].status = 'skipped';
    }
  } catch (err: any) {
    steps[2].status = 'failed';
    steps[2].error = err.message;
  }

  // Step 4 — propose journal (human approval)
  steps[3].status = 'running';
  try {
    const approval = await queueAiApprovalRequest({
      tenantId: input.tenantId,
      userId: input.userId,
      actionKey: 'createJournalEntry',
      risk: 'high',
      title: `Контировка за покупка ${ocr.invoiceNumber || ''}`.trim(),
      description: `Предложена статия: Дт 602 / Кт 401 за ${total.toFixed(2)} ${ocr.currency || 'EUR'} (${ocr.counterpartyName})`,
      sourceType: 'purchase_invoice',
      sourceId: purchaseInvoiceId || undefined,
      payload: {
        description: `Покупка ${ocr.invoiceNumber || ''} от ${ocr.counterpartyName || 'доставчик'}`.trim(),
        amount: total,
        debitAccountCode: '602',
        creditAccountCode: '401',
        date: ocr.date && ocr.date !== 'Unknown' ? ocr.date : undefined,
      },
      summary: {
        correlationId,
        purchaseInvoiceId,
        documentId: input.documentId,
      },
    });
    steps[3].status = 'waiting_approval';
    steps[3].result = approval;
    await publishAiEvent({
      type: 'accounting.journal_proposed',
      tenantId: input.tenantId,
      userId: input.userId,
      correlationId,
      sourceType: 'ai_approval',
      sourceId: approval.approvalId,
      message: approval.message,
      payload: { approvalId: approval.approvalId },
    });
  } catch (err: any) {
    steps[3].status = 'failed';
    steps[3].error = err.message;
  }

  // Step 5 — bank match (best effort, non-blocking)
  steps[4].status = 'running';
  try {
    const accounts = await db.select({ id: bankAccounts.id }).from(bankAccounts).where(eq(bankAccounts.tenantId, input.tenantId));
    const accountIds = accounts.map((a) => a.id);
    let matched = 0;

    if (accountIds.length && total > 0) {
      const txs = await db
        .select()
        .from(bankTransactions)
        .where(and(inArray(bankTransactions.accountId, accountIds), eq(bankTransactions.isReconciled, false)))
        .limit(40);

      const candidates = txs
        .filter((tx) => Math.abs(parseFloat(tx.amount || '0')) > 0)
        .map((tx) => ({
          id: tx.id,
          amount: parseFloat(tx.amount || '0'),
          description: tx.description || '',
          counterpartyName: tx.counterpartyName || '',
          date: tx.bookingDate || tx.valueDate || '',
        }));

      // Prefer exact amount match first (fast path)
      const exact = txs.find((tx) => Math.abs(Math.abs(parseFloat(tx.amount || '0')) - total) < 0.01);
      if (exact) {
        await db
          .update(bankTransactions)
          .set({
            matchStatus: 'suggested',
            matchConfidence: '0.95',
            matchedInvoiceId: purchaseInvoiceId,
          })
          .where(eq(bankTransactions.id, exact.id));
        matched = 1;
        await db.insert(aiInboxItems).values({
          tenantId: input.tenantId,
          type: 'bank_match_suggested',
          sourceType: 'bank_transaction',
          sourceId: exact.id,
          title: 'Предложено банково съпоставяне',
          description: `Превод ${exact.amount} ≈ фактура ${ocr.invoiceNumber || purchaseInvoiceId}`,
          confidence: '0.95',
          status: 'open',
          priority: 'normal',
          metaJson: { correlationId, purchaseInvoiceId, transactionId: exact.id },
        });
      } else if (candidates.length && process.env.ANTHROPIC_API_KEY) {
        const aiMatch = await matchTransactionWithAI(
          {
            id: purchaseInvoiceId || correlationId,
            amount: -Math.abs(total),
            description: ocr.extractedText || ocr.invoiceNumber || '',
            currency: ocr.currency || 'EUR',
            date: ocr.date || new Date().toISOString().slice(0, 10),
          },
          candidates.slice(0, 10).map((tx) => ({
            id: tx.id,
            type: 'expense' as const,
            counterpartyName: tx.counterpartyName || '',
            totalAmount: Math.abs(tx.amount),
            currency: ocr.currency || 'EUR',
            documentNumber: tx.description,
            date: tx.date,
          })),
        ).catch(() => null);
        if (aiMatch?.matchedId && (aiMatch.confidenceScore ?? 0) >= 80) {
          await db
            .update(bankTransactions)
            .set({
              matchStatus: 'suggested',
              matchConfidence: String((aiMatch.confidenceScore || 0) / 100),
              matchedInvoiceId: purchaseInvoiceId,
            })
            .where(eq(bankTransactions.id, aiMatch.matchedId));
          matched = 1;
        }
      }
    }

    steps[4].status = matched ? 'completed' : 'skipped';
    steps[4].result = { matched };
  } catch (err: any) {
    steps[4].status = 'skipped';
    steps[4].error = err.message;
  }

  // Step 6 — inbox notify
  steps[5].status = 'running';
  try {
    await db.insert(aiInboxItems).values({
      tenantId: input.tenantId,
      type: 'document_pipeline_ready',
      sourceType: 'document',
      sourceId: input.documentId || purchaseInvoiceId || correlationId,
      title: 'Документът е готов за преглед',
      description: `Pipeline: документ → фактура → склад → контировка. Корелация: ${correlationId.slice(0, 8)}`,
      confidence: '0.92',
      status: 'open',
      priority: 'normal',
      metaJson: {
        correlationId,
        purchaseInvoiceId,
        documentId: input.documentId,
        steps: steps.map((s) => ({ key: s.key, status: s.status })),
      },
    });
    steps[5].status = 'completed';
  } catch (err: any) {
    steps[5].status = 'failed';
    steps[5].error = err.message;
  }

  const completed = steps.filter((s) => s.status === 'completed' || s.status === 'waiting_approval' || s.status === 'skipped').length;
  const failed = steps.some((s) => s.status === 'failed');
  const waiting = steps.some((s) => s.status === 'waiting_approval');
  const status = failed ? 'partial' : waiting ? 'waiting_approval' : 'completed';

  await upsertRun({
    id: run.id,
    tenantId: input.tenantId,
    correlationId,
    pipeline: 'document_lifecycle',
    status,
    currentStep: steps.find((s) => s.status === 'waiting_approval' || s.status === 'running')?.key || 'done',
    stepsCompleted: completed,
    stepsTotal: steps.length,
    sourceType: 'document',
    sourceId: input.documentId,
    summary: `Document lifecycle ${status}: ${ocr.counterpartyName || 'документ'}`,
    metaJson: { steps, purchaseInvoiceId },
  });

  await publishAiEvent({
    type: 'pipeline.completed',
    tenantId: input.tenantId,
    userId: input.userId,
    correlationId,
    sourceType: 'pipeline',
    sourceId: run.id,
    message: `Pipeline document_lifecycle → ${status}`,
    payload: { steps, purchaseInvoiceId },
  });

  return {
    success: !failed,
    correlationId,
    runId: run.id,
    status,
    purchaseInvoiceId,
    steps,
  };
}

/**
 * Bank sync pipeline: match open sales invoices against unreconciled txs,
 * queue uncertain matches to AI Inbox.
 */
export async function runBankSyncPipeline(input: { tenantId: string; userId?: string | null; correlationId?: string }) {
  const correlationId = input.correlationId || randomUUID();
  const accounts = await db.select({ id: bankAccounts.id }).from(bankAccounts).where(eq(bankAccounts.tenantId, input.tenantId));
  if (!accounts.length) {
    return { success: true, matched: 0, suggested: 0, message: 'Няма банкови сметки.' };
  }

  const accountIds = accounts.map((a) => a.id);
  const txs = await db
    .select()
    .from(bankTransactions)
    .where(and(inArray(bankTransactions.accountId, accountIds), eq(bankTransactions.isReconciled, false)));

  const openInvoices = (await db.select().from(invoices).where(eq(invoices.tenantId, input.tenantId))).filter(
    (i) => i.status !== 'paid' && i.type === 'sale',
  );

  let matched = 0;
  let suggested = 0;

  for (const tx of txs.filter((t) => parseFloat(t.amount || '0') > 0)) {
    const txAmount = parseFloat(tx.amount || '0');
    const txDesc = (tx.description || '').toLowerCase();
    let best = null as (typeof openInvoices)[number] | null;
    let score = 0;

    for (const inv of openInvoices) {
      let s = 0;
      const invAmount = parseFloat(inv.totalAmount || '0');
      if (Math.abs(txAmount - invAmount) < 0.01) s += 0.6;
      if (inv.invoiceNumber && txDesc.includes(String(inv.invoiceNumber).toLowerCase())) s += 0.4;
      if (inv.clientName && tx.counterpartyName?.toLowerCase().includes(inv.clientName.toLowerCase())) s += 0.2;
      if (s > score) {
        score = s;
        best = inv;
      }
    }

    if (!best) continue;

    if (score >= 0.9) {
      await db
        .update(bankTransactions)
        .set({ isReconciled: true, matchedInvoiceId: best.id, matchStatus: 'confirmed', matchConfidence: String(score) })
        .where(eq(bankTransactions.id, tx.id));
      await db.update(invoices).set({ status: 'paid' }).where(eq(invoices.id, best.id));
      matched++;
      const idx = openInvoices.findIndex((i) => i.id === best!.id);
      if (idx >= 0) openInvoices.splice(idx, 1);
    } else if (score >= 0.6) {
      await db
        .update(bankTransactions)
        .set({ matchedInvoiceId: best.id, matchStatus: 'suggested', matchConfidence: String(score) })
        .where(eq(bankTransactions.id, tx.id));
      await db.insert(aiInboxItems).values({
        tenantId: input.tenantId,
        type: 'bank_match_suggested',
        sourceType: 'bank_transaction',
        sourceId: tx.id,
        title: 'Банково съпоставяне за преглед',
        description: `Превод ${txAmount} ↔ фактура ${best.invoiceNumber} (увереност ${(score * 100).toFixed(0)}%)`,
        confidence: score.toFixed(2),
        status: 'open',
        priority: score >= 0.8 ? 'normal' : 'high',
        metaJson: { correlationId, invoiceId: best.id, transactionId: tx.id, score },
      });
      suggested++;
    }
  }

  await upsertRun({
    tenantId: input.tenantId,
    correlationId,
    pipeline: 'bank_sync',
    status: 'completed',
    currentStep: 'done',
    stepsCompleted: 1,
    stepsTotal: 1,
    sourceType: 'banking',
    summary: `Bank sync: matched ${matched}, suggested ${suggested}`,
    metaJson: { matched, suggested },
  });

  await publishAiEvent({
    type: 'banking.match_confirmed',
    tenantId: input.tenantId,
    userId: input.userId,
    correlationId,
    message: `Банков sync: ${matched} автоматични, ${suggested} за преглед`,
    payload: { matched, suggested },
  });

  return {
    success: true,
    correlationId,
    matched,
    suggested,
    message: `Банков sync: ${matched} автоматични съвпадения, ${suggested} предложения в AI Inbox.`,
  };
}

/**
 * Month-close orchestration: propose VAT + depreciation approvals in one sweep.
 */
export async function runMonthClosePipeline(input: {
  tenantId: string;
  userId?: string | null;
  year?: number;
  month?: number;
}) {
  const now = new Date();
  const year = input.year ?? now.getFullYear();
  const month = input.month ?? now.getMonth() + 1;
  const correlationId = randomUUID();

  const vatApproval = await queueAiApprovalRequest({
    tenantId: input.tenantId,
    userId: input.userId,
    actionKey: 'generateVat',
    risk: 'critical',
    title: `Месечно приключване: ДДС ${month}/${year}`,
    description: 'AI подготви генериране на ДДС дневници. Одобрете за запис.',
    sourceType: 'vat_journal',
    payload: { year, month },
    summary: { correlationId, year, month },
  });

  const depApproval = await queueAiApprovalRequest({
    tenantId: input.tenantId,
    userId: input.userId,
    actionKey: 'depreciateAssets',
    risk: 'high',
    title: `Месечно приключване: амортизации ${month}/${year}`,
    description: 'AI подготви начисляване на амортизации. Одобрете за осчетоводяване.',
    sourceType: 'fixed_asset',
    payload: { year, month },
    summary: { correlationId, year, month },
  });

  await upsertRun({
    tenantId: input.tenantId,
    correlationId,
    pipeline: 'month_close',
    status: 'waiting_approval',
    currentStep: 'approvals',
    stepsCompleted: 0,
    stepsTotal: 2,
    summary: `Month close proposals for ${month}/${year}`,
    metaJson: { vatApprovalId: vatApproval.approvalId, depApprovalId: depApproval.approvalId },
  });

  return {
    success: true,
    correlationId,
    year,
    month,
    approvals: [vatApproval, depApproval],
    message: `Месечно приключване ${month}/${year}: създадени са 2 заявки за одобрение (ДДС + амортизации).`,
  };
}
