// @ts-nocheck
import { randomUUID } from 'node:crypto';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { db } from '@/lib/db/db';
import { inventoryItems, inventoryMovements } from '@/lib/db/schema/inventory';
import { companyDivisions } from '@/lib/db/schema/company_structure';
import { aiInboxItems } from '@/lib/db/schema/ai_inbox';
import { tasks } from '@/lib/db/schema/tasks';
import { aiAgentRuns } from '@/lib/db/schema/ai_agent_runs';
import { queueAiApprovalRequest } from '@/lib/ai/automation/approval-queue';
import { publishAiEvent } from './events';
import type { PipelineStep } from './types';

const LOW_STOCK_THRESHOLD = 5;

async function getDefaultDivision(tenantId: string) {
  const [existing] = await db
    .select()
    .from(companyDivisions)
    .where(eq(companyDivisions.tenantId, tenantId))
    .limit(1);
  if (existing) return existing.id;

  const [created] = await db
    .insert(companyDivisions)
    .values({ tenantId, name: 'Централен Склад' })
    .returning();
  return created.id;
}

async function trackRun(input: {
  tenantId: string;
  correlationId: string;
  pipeline: string;
  status: string;
  summary?: string;
  sourceType?: string;
  sourceId?: string;
  metaJson?: unknown;
  stepsCompleted?: number;
  stepsTotal?: number;
  currentStep?: string;
}) {
  try {
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
    console.warn('[inventory-pipeline] ai_agent_runs skipped:', (err as Error)?.message);
    return { id: randomUUID(), ...input };
  }
}

async function computeStock(tenantId: string, itemId: string) {
  const movements = await db
    .select()
    .from(inventoryMovements)
    .where(and(eq(inventoryMovements.tenantId, tenantId), eq(inventoryMovements.itemId, itemId)));

  let qty = 0;
  for (const m of movements) {
    const q = parseFloat(m.quantity || '0');
    if (m.type === 'in' || m.type === 'adjustment') qty += q;
    else if (m.type === 'out') qty -= q;
  }
  return qty;
}

async function maybeCreateLowStockTask(tenantId: string, item: { id: string; name: string }, stock: number) {
  if (stock > LOW_STOCK_THRESHOLD) return null;

  const title = `СНАБДЯВАНЕ: Изчерпва се "${item.name}" (Остават: ${stock})`;
  const existing = await db.select().from(tasks).where(eq(tasks.tenantId, tenantId));
  if (existing.some((t) => t.title === title && t.status !== 'completed')) return null;

  const [task] = await db
    .insert(tasks)
    .values({
      tenantId,
      title,
      description: `Автоматичен сигнал от складовия pipeline: наличността на "${item.name}" е ${stock} (праг ${LOW_STOCK_THRESHOLD}).`,
      priority: 'high',
      assignee: 'Мениджър Снабдяване',
      status: 'suggested',
    })
    .returning()
    .catch(() => [null]);

  await db.insert(aiInboxItems).values({
    tenantId,
    type: 'inventory_low_stock',
    sourceType: 'inventory_item',
    sourceId: item.id,
    title: `Ниска наличност: ${item.name}`,
    description: `Остават ${stock} бр. Създадена е задача за снабдяване.`,
    confidence: '0.95',
    status: 'open',
    priority: stock <= 0 ? 'critical' : 'high',
    metaJson: { stock, threshold: LOW_STOCK_THRESHOLD, taskId: task?.id },
  });

  return task;
}

/**
 * Called when a product is registered in the warehouse nomenclature.
 */
export async function runInventoryProductRegistered(input: {
  tenantId: string;
  userId?: string | null;
  itemId: string;
  sku: string;
  name: string;
  barcode?: string | null;
  unitOfMeasure?: string;
}) {
  const correlationId = randomUUID();
  const steps: PipelineStep[] = [
    { key: 'catalog', domain: 'inventory', label: 'Регистрация в номенклатура', status: 'completed' },
    { key: 'inbox', domain: 'orchestrator', label: 'Известие в AI Inbox', status: 'pending' },
    { key: 'accounting_hint', domain: 'accounting', label: 'Счетоводен hint (сметка 304)', status: 'pending' },
  ];

  await publishAiEvent({
    type: 'inventory.product_registered',
    tenantId: input.tenantId,
    userId: input.userId,
    correlationId,
    sourceType: 'inventory_item',
    sourceId: input.itemId,
    message: `Нов артикул: ${input.name} (SKU ${input.sku}${input.barcode ? `, баркод ${input.barcode}` : ''})`,
    payload: {
      itemId: input.itemId,
      sku: input.sku,
      name: input.name,
      barcode: input.barcode,
    },
  });

  try {
    await db.insert(aiInboxItems).values({
      tenantId: input.tenantId,
      type: 'inventory_product_registered',
      sourceType: 'inventory_item',
      sourceId: input.itemId,
      title: `Регистриран продукт: ${input.name}`,
      description: `SKU: ${input.sku}${input.barcode ? ` · Баркод: ${input.barcode}` : ''}. Готов за заприходяване и сканиране.`,
      confidence: '1.00',
      status: 'open',
      priority: 'low',
      metaJson: { correlationId, sku: input.sku, barcode: input.barcode },
    });
    steps[1].status = 'completed';
  } catch (err: any) {
    steps[1].status = 'failed';
    steps[1].error = err.message;
  }

  // Soft accounting reminder — link inventory account mentally (304)
  steps[2].status = 'completed';
  steps[2].result = { suggestedAccount: '304', note: 'Стоки' };

  await trackRun({
    tenantId: input.tenantId,
    correlationId,
    pipeline: 'inventory_register',
    status: 'completed',
    currentStep: 'done',
    stepsCompleted: steps.filter((s) => s.status === 'completed').length,
    stepsTotal: steps.length,
    sourceType: 'inventory_item',
    sourceId: input.itemId,
    summary: `Product registered: ${input.name}`,
    metaJson: { steps },
  });

  return { success: true, correlationId, steps };
}

/**
 * Called on stock IN / OUT movements.
 * OUT proposes COGS journal (Дт 601 / Кт 304) for human approval.
 * IN proposes receipt journal (Дт 304 / Кт 401) when value > 0.
 */
export async function runInventoryMovementPipeline(input: {
  tenantId: string;
  userId?: string | null;
  movementId?: string;
  itemId: string;
  type: 'in' | 'out';
  quantity: number;
  unitCost: number;
  source?: 'manual' | 'scan' | 'invoice' | 'ai';
}) {
  const correlationId = randomUUID();
  const [item] = await db
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.id, input.itemId), eq(inventoryItems.tenantId, input.tenantId)))
    .limit(1);

  if (!item) {
    return { success: false, error: 'Артикулът не е намерен.' };
  }

  const totalCost = input.quantity * input.unitCost;
  const stock = await computeStock(input.tenantId, input.itemId);

  // Keep denormalized quantity in sync
  await db
    .update(inventoryItems)
    .set({ quantity: stock.toFixed(3) })
    .where(eq(inventoryItems.id, item.id))
    .catch(() => null);

  const eventType = input.type === 'out' ? 'inventory.product_issued' : 'inventory.product_received';
  await publishAiEvent({
    type: eventType,
    tenantId: input.tenantId,
    userId: input.userId,
    correlationId,
    sourceType: 'inventory_movement',
    sourceId: input.movementId || item.id,
    message:
      input.type === 'out'
        ? `Изписани ${input.quantity} ${item.unitOfMeasure} от ${item.name}`
        : `Заприходени ${input.quantity} ${item.unitOfMeasure} от ${item.name}`,
    payload: {
      itemId: item.id,
      type: input.type,
      quantity: input.quantity,
      unitCost: input.unitCost,
      totalCost,
      stockAfter: stock,
      source: input.source || 'manual',
    },
  });

  let approval = null;
  if (totalCost > 0) {
    if (input.type === 'out') {
      approval = await queueAiApprovalRequest({
        tenantId: input.tenantId,
        userId: input.userId,
        actionKey: 'createJournalEntry',
        risk: 'medium',
        title: `Складово изписване: ${item.name}`,
        description: `Предложена статия Дт 601 / Кт 304 за ${totalCost.toFixed(2)} EUR (${input.quantity} × ${input.unitCost})`,
        sourceType: 'inventory_movement',
        sourceId: input.movementId,
        payload: {
          description: `Изписване от склад: ${item.name} (${input.quantity} ${item.unitOfMeasure})`,
          amount: totalCost,
          debitAccountCode: '601',
          creditAccountCode: '304',
        },
        summary: { correlationId, itemId: item.id, type: 'out', quantity: input.quantity },
      });
    } else {
      approval = await queueAiApprovalRequest({
        tenantId: input.tenantId,
        userId: input.userId,
        actionKey: 'createJournalEntry',
        risk: 'medium',
        title: `Складово заприходяване: ${item.name}`,
        description: `Предложена статия Дт 304 / Кт 401 за ${totalCost.toFixed(2)} EUR`,
        sourceType: 'inventory_movement',
        sourceId: input.movementId,
        payload: {
          description: `Заприходяване в склад: ${item.name} (${input.quantity} ${item.unitOfMeasure})`,
          amount: totalCost,
          debitAccountCode: '304',
          creditAccountCode: '401',
        },
        summary: { correlationId, itemId: item.id, type: 'in', quantity: input.quantity },
      });
    }
  }

  let lowStockTask = null;
  if (input.type === 'out') {
    lowStockTask = await maybeCreateLowStockTask(input.tenantId, item, stock);
  }

  await db.insert(aiInboxItems).values({
    tenantId: input.tenantId,
    type: input.type === 'out' ? 'inventory_issue' : 'inventory_receipt',
    sourceType: 'inventory_item',
    sourceId: item.id,
    title: input.type === 'out' ? `Изписване: ${item.name}` : `Заприходяване: ${item.name}`,
    description: `${input.quantity} ${item.unitOfMeasure} · стойност ${totalCost.toFixed(2)} EUR · наличност след: ${stock}`,
    confidence: '0.98',
    status: 'open',
    priority: stock <= 0 ? 'high' : 'normal',
    metaJson: {
      correlationId,
      movementId: input.movementId,
      approvalId: approval?.approvalId,
      stockAfter: stock,
      source: input.source || 'manual',
    },
  });

  await trackRun({
    tenantId: input.tenantId,
    correlationId,
    pipeline: input.type === 'out' ? 'inventory_issue' : 'inventory_receipt',
    status: approval ? 'waiting_approval' : 'completed',
    currentStep: approval ? 'journal_approval' : 'done',
    stepsCompleted: 2,
    stepsTotal: 3,
    sourceType: 'inventory_item',
    sourceId: item.id,
    summary: `${input.type} ${input.quantity} × ${item.name}`,
    metaJson: { approvalId: approval?.approvalId, stock, lowStockTaskId: lowStockTask?.id },
  });

  return {
    success: true,
    correlationId,
    stockAfter: stock,
    approval,
    lowStockTask,
    item: { id: item.id, name: item.name, sku: item.sku, barcode: item.barcode },
  };
}

/**
 * Barcode / QR scan automation:
 * - finds item by barcode or SKU
 * - if missing → inbox + optional quick-register suggestion
 * - if found → event + optional quick OUT of 1 unit when autoIssue=true
 */
export async function runInventoryScanPipeline(input: {
  tenantId: string;
  userId?: string | null;
  code: string;
  autoIssue?: boolean;
  issueQuantity?: number;
}) {
  const correlationId = randomUUID();
  const code = (input.code || '').trim();
  if (!code) return { success: false, error: 'Празен баркод.' };

  const [item] = await db
    .select()
    .from(inventoryItems)
    .where(
      and(
        eq(inventoryItems.tenantId, input.tenantId),
        or(ilike(inventoryItems.sku, code), ilike(inventoryItems.barcode, code)),
      ),
    )
    .limit(1);

  await publishAiEvent({
    type: 'inventory.code_scanned',
    tenantId: input.tenantId,
    userId: input.userId,
    correlationId,
    sourceType: 'inventory_scan',
    sourceId: item?.id || correlationId,
    message: item ? `Сканиран: ${item.name} (${code})` : `Непознат баркод: ${code}`,
    payload: { code, found: !!item, itemId: item?.id },
  });

  if (!item) {
    await db.insert(aiInboxItems).values({
      tenantId: input.tenantId,
      type: 'inventory_unknown_barcode',
      sourceType: 'inventory_scan',
      sourceId: correlationId,
      title: `Непознат баркод: ${code}`,
      description: 'Сканираният код не е в номенклатурата. Регистрирайте артикул или свържете баркода.',
      confidence: '0.99',
      status: 'open',
      priority: 'high',
      metaJson: { correlationId, code, suggestedAction: 'register_product' },
    });

    await trackRun({
      tenantId: input.tenantId,
      correlationId,
      pipeline: 'inventory_scan',
      status: 'partial',
      currentStep: 'unknown_code',
      stepsCompleted: 1,
      stepsTotal: 2,
      sourceType: 'inventory_scan',
      summary: `Unknown barcode ${code}`,
      metaJson: { code },
    });

    return {
      success: true,
      found: false,
      correlationId,
      code,
      message: `Баркод "${code}" не е намерен. Създадено е известие в AI Inbox за регистрация.`,
    };
  }

  // Persist barcode if scanned via SKU match and barcode empty
  if (!item.barcode && code.toLowerCase() !== (item.sku || '').toLowerCase()) {
    await db.update(inventoryItems).set({ barcode: code }).where(eq(inventoryItems.id, item.id)).catch(() => null);
  }

  const stock = await computeStock(input.tenantId, item.id);
  let issueResult = null;

  if (input.autoIssue) {
    const qty = input.issueQuantity && input.issueQuantity > 0 ? input.issueQuantity : 1;
    if (stock < qty) {
      await db.insert(aiInboxItems).values({
        tenantId: input.tenantId,
        type: 'inventory_insufficient_stock',
        sourceType: 'inventory_item',
        sourceId: item.id,
        title: `Недостатъчна наличност при сканиране: ${item.name}`,
        description: `Заявени ${qty}, налични ${stock}. Баркод: ${code}`,
        confidence: '1.00',
        status: 'open',
        priority: 'critical',
        metaJson: { correlationId, code, requested: qty, stock },
      });
    } else {
      const divisionId = await getDefaultDivision(input.tenantId);
      const unitCost = parseFloat(item.quantity || '0') > 0 ? 0 : 0; // cost filled by weighted avg in UI; keep 0 if unknown
      // Estimate unit cost from last IN movement
      const [lastIn] = await db
        .select()
        .from(inventoryMovements)
        .where(
          and(
            eq(inventoryMovements.tenantId, input.tenantId),
            eq(inventoryMovements.itemId, item.id),
            eq(inventoryMovements.type, 'in'),
          ),
        )
        .orderBy(desc(inventoryMovements.movementDate))
        .limit(1)
        .catch(() => [null]);

      const cost = parseFloat(lastIn?.unitCost || '0') || 0;
      const [movement] = await db
        .insert(inventoryMovements)
        .values({
          tenantId: input.tenantId,
          itemId: item.id,
          divisionId,
          type: 'out',
          quantity: qty.toString(),
          unitCost: cost.toString(),
          totalCost: (qty * cost).toString(),
          movementDate: new Date(),
        })
        .returning();

      issueResult = await runInventoryMovementPipeline({
        tenantId: input.tenantId,
        userId: input.userId,
        movementId: movement.id,
        itemId: item.id,
        type: 'out',
        quantity: qty,
        unitCost: cost,
        source: 'scan',
      });
    }
  } else {
    await db.insert(aiInboxItems).values({
      tenantId: input.tenantId,
      type: 'inventory_scan_ready',
      sourceType: 'inventory_item',
      sourceId: item.id,
      title: `Сканиран артикул: ${item.name}`,
      description: `Код ${code} · наличност ${stock} ${item.unitOfMeasure}. Изберете Вход или Изход.`,
      confidence: '1.00',
      status: 'open',
      priority: 'low',
      metaJson: { correlationId, code, stock, sku: item.sku, barcode: item.barcode || code },
    });
  }

  await trackRun({
    tenantId: input.tenantId,
    correlationId,
    pipeline: 'inventory_scan',
    status: issueResult ? (issueResult.approval ? 'waiting_approval' : 'completed') : 'completed',
    currentStep: 'done',
    stepsCompleted: 2,
    stepsTotal: 2,
    sourceType: 'inventory_item',
    sourceId: item.id,
    summary: `Scanned ${item.name} (${code})`,
    metaJson: { code, autoIssue: !!input.autoIssue, issueResult },
  });

  return {
    success: true,
    found: true,
    correlationId,
    code,
    item: {
      id: item.id,
      name: item.name,
      sku: item.sku,
      barcode: item.barcode || code,
      unitOfMeasure: item.unitOfMeasure,
      currentQuantity: issueResult?.stockAfter ?? stock,
    },
    issue: issueResult,
    message: issueResult
      ? `Сканиран и изписан: ${item.name}`
      : `Сканиран: ${item.name} · наличност ${stock} ${item.unitOfMeasure}`,
  };
}

/**
 * After OCR/purchase draft — stock goods lines into warehouse (or create items).
 */
export async function runInventoryFromPurchaseDraft(input: {
  tenantId: string;
  userId?: string | null;
  purchaseInvoiceId: string;
  lineItems?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total?: number;
    itemType?: string;
  }>;
}) {
  const correlationId = randomUUID();
  const divisionId = await getDefaultDivision(input.tenantId);
  let movementsAdded = 0;
  const createdItems: string[] = [];

  const lines = (input.lineItems || []).filter((l) => l.itemType !== 'service');
  for (const line of lines) {
    if (!line.description) continue;
    const qty = Number(line.quantity || 1);
    if (qty <= 0) continue;
    const unitCost = Number(line.unitPrice || (line.total || 0) / qty || 0);

    let [item] = await db
      .select()
      .from(inventoryItems)
      .where(and(eq(inventoryItems.tenantId, input.tenantId), ilike(inventoryItems.name, line.description.trim())))
      .limit(1);

    if (!item) {
      const [newItem] = await db
        .insert(inventoryItems)
        .values({
          tenantId: input.tenantId,
          sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
          name: line.description.trim(),
          unitOfMeasure: 'бр',
          costingMethod: 'weighted_average',
          quantity: '0',
          itemType: 'goods',
        })
        .returning();
      item = newItem;
      createdItems.push(item.name);
      await runInventoryProductRegistered({
        tenantId: input.tenantId,
        userId: input.userId,
        itemId: item.id,
        sku: item.sku,
        name: item.name,
      }).catch(() => null);
    }

    const [movement] = await db
      .insert(inventoryMovements)
      .values({
        tenantId: input.tenantId,
        itemId: item.id,
        divisionId,
        type: 'in',
        quantity: qty.toString(),
        unitCost: unitCost.toString(),
        totalCost: (qty * unitCost).toString(),
        movementDate: new Date(),
        referenceId: looksLikeUuid(input.purchaseInvoiceId) ? input.purchaseInvoiceId : null,
      })
      .returning();

    await runInventoryMovementPipeline({
      tenantId: input.tenantId,
      userId: input.userId,
      movementId: movement.id,
      itemId: item.id,
      type: 'in',
      quantity: qty,
      unitCost,
      source: 'invoice',
    }).catch(() => null);

    movementsAdded++;
  }

  await publishAiEvent({
    type: 'inventory.stock_synced',
    tenantId: input.tenantId,
    userId: input.userId,
    correlationId,
    sourceType: 'purchase_invoice',
    sourceId: input.purchaseInvoiceId,
    message: `Склад: заприходени ${movementsAdded} реда от покупна фактура`,
    payload: { movementsAdded, createdItems },
  });

  return { success: true, correlationId, movementsAdded, createdItems };
}

function looksLikeUuid(value?: string | null) {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
