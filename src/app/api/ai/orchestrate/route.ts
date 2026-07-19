// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/auth/get-tenant';
import { OrchestratorAgent } from '@/ai/orchestrator';
import {
  runBankSyncPipeline,
  runDocumentLifecyclePipeline,
  runMonthClosePipeline,
  runInventoryScanPipeline,
  runInventoryProductRegistered,
  runInventoryMovementPipeline,
} from '@/lib/ai/orchestration';

/**
 * Unified orchestration endpoint for cross-agent automation.
 *
 * POST body:
 *  { action: 'plan' | 'execute' | 'document_lifecycle' | 'bank_sync' | 'month_close'
 *          | 'inventory_scan' | 'inventory_register' | 'inventory_movement', ... }
 */
export async function POST(req: NextRequest) {
  try {
    const { tenantId, userId } = await requireTenant();
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'plan';

    if (action === 'plan') {
      const text = body.text || body.query || '';
      if (!text) return NextResponse.json({ success: false, error: 'Missing text' }, { status: 400 });
      const plan = await OrchestratorAgent.routeAndProcess(text);
      return NextResponse.json({ success: true, ...plan });
    }

    if (action === 'execute') {
      const text = body.text || body.query || '';
      if (!text) return NextResponse.json({ success: false, error: 'Missing text' }, { status: 400 });
      const result = await OrchestratorAgent.planAndExecute(text, {
        tenantId,
        userId,
        execute: true,
      });
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'document_lifecycle') {
      if (!body.ocr) {
        return NextResponse.json({ success: false, error: 'Missing ocr payload' }, { status: 400 });
      }
      const result = await runDocumentLifecyclePipeline({
        tenantId,
        userId,
        documentId: body.documentId,
        ocr: body.ocr,
        correlationId: body.correlationId,
      });
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'bank_sync') {
      const result = await runBankSyncPipeline({ tenantId, userId });
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'month_close') {
      const result = await runMonthClosePipeline({
        tenantId,
        userId,
        year: body.year,
        month: body.month,
      });
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'inventory_scan') {
      if (!body.code) {
        return NextResponse.json({ success: false, error: 'Missing code' }, { status: 400 });
      }
      const result = await runInventoryScanPipeline({
        tenantId,
        userId,
        code: body.code,
        autoIssue: !!body.autoIssue,
        issueQuantity: body.issueQuantity,
      });
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'inventory_register') {
      if (!body.itemId || !body.sku || !body.name) {
        return NextResponse.json({ success: false, error: 'Missing itemId/sku/name' }, { status: 400 });
      }
      const result = await runInventoryProductRegistered({
        tenantId,
        userId,
        itemId: body.itemId,
        sku: body.sku,
        name: body.name,
        barcode: body.barcode,
        unitOfMeasure: body.unitOfMeasure,
      });
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'inventory_movement') {
      if (!body.itemId || !body.type || !body.quantity) {
        return NextResponse.json({ success: false, error: 'Missing itemId/type/quantity' }, { status: 400 });
      }
      const result = await runInventoryMovementPipeline({
        tenantId,
        userId,
        movementId: body.movementId,
        itemId: body.itemId,
        type: body.type,
        quantity: Number(body.quantity),
        unitCost: Number(body.unitCost || 0),
        source: body.source || 'manual',
      });
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('[AI Orchestrate]', error);
    const status = error?.message === 'Not authenticated' ? 401 : 500;
    return NextResponse.json({ success: false, error: error.message || 'Orchestration failed' }, { status });
  }
}
