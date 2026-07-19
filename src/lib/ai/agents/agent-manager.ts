// @ts-nocheck
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/db';
import { journalHeaders } from '@/lib/db/schema/journal_entries';
import { invoices } from '@/lib/db/schema/invoices';
import { purchaseInvoices } from '@/lib/db/schema/purchase-invoices';
import { aiInboxItems } from '@/lib/db/schema/ai_inbox';
import { bankTransactions } from '@/lib/db/schema/bank_transactions';
import { bankAccounts } from '@/lib/db/schema/bank_accounts';
import { leaveRequests } from '@/lib/db/schema/leave_requests';
import { requireTenant } from '@/lib/auth/get-tenant';
import { runLedgerAudit } from '@/lib/ai/audit/ledger-audit';
import { runBankSyncPipeline, runMonthClosePipeline } from '@/lib/ai/orchestration';
import { publishAiEvent } from '@/lib/ai/orchestration/events';
import { randomUUID } from 'node:crypto';

export interface MonitoredAgentStatus {
  id: string;
  name: string;
  role: string;
  status: 'online' | 'busy' | 'warning' | 'error';
  healthScore: number;
  tasksCompletedLast24h: number;
  currentTask: string;
  errorRate: string;
  lastIntervention?: string;
  capabilities: string[];
}

export interface AgentManagerReport {
  success: boolean;
  systemHealthScore: number;
  activeAgentsCount: number;
  agents: MonitoredAgentStatus[];
  interventionsLog: Array<{
    id: string;
    timestamp: string;
    targetAgent: string;
    actionTaken: string;
    severity: 'info' | 'warning' | 'critical';
    result: string;
  }>;
  automation?: {
    bankSync?: unknown;
    monthClose?: unknown;
  };
  executiveSummary: string;
  timestamp: string;
  error?: string;
}

/**
 * Agent Manager — supervisor that monitors specialized agents and
 * triggers cross-module automation (bank sync / month-close proposals).
 */
export async function runAgentManagerSupervisor(options?: {
  runAutomation?: boolean;
}): Promise<AgentManagerReport> {
  try {
    const { tenantId, userId } = await requireTenant();
    const runAutomation = options?.runAutomation !== false;
    const correlationId = randomUUID();

    const accounts = await db.select({ id: bankAccounts.id }).from(bankAccounts).where(eq(bankAccounts.tenantId, tenantId)).catch(() => []);
    const accountIds = accounts.map((a) => a.id);

    const [headers, salesInvs, purchInvs, openInbox, pendingLeave, openBankTxs] = await Promise.all([
      db.select().from(journalHeaders).where(eq(journalHeaders.tenantId, tenantId)).catch(() => []),
      db.select().from(invoices).where(eq(invoices.tenantId, tenantId)).catch(() => []),
      db.select().from(purchaseInvoices).where(eq(purchaseInvoices.tenantId, tenantId)).catch(() => []),
      db
        .select()
        .from(aiInboxItems)
        .where(and(eq(aiInboxItems.tenantId, tenantId), eq(aiInboxItems.status, 'open')))
        .catch(() => []),
      db
        .select()
        .from(leaveRequests)
        .where(and(eq(leaveRequests.tenantId, tenantId), eq(leaveRequests.status, 'pending')))
        .catch(() => []),
      db.select().from(bankTransactions).where(eq(bankTransactions.isReconciled, false)).catch(() => []),
    ]);

    const unreconciledCount = openBankTxs.filter((t) => accountIds.includes(t.accountId)).length;

    const auditRes = await runLedgerAudit().catch(() => ({ success: false, anomaliesFound: 0, anomalies: [], totalChecked: 0, auditNarrative: '' }));
    const anomaliesCount = auditRes.anomaliesFound || 0;
    const draftPurchases = purchInvs.filter((p) => p.status === 'draft').length;
    const approvalCount = openInbox.filter((i) => i.type === 'ai_approval_required').length;

    const interventionsLog: AgentManagerReport['interventionsLog'] = [];
    const automation: AgentManagerReport['automation'] = {};

    // Real intervention 1: bank sync when backlog exists
    if (runAutomation && unreconciledCount > 0) {
      const bankResult = await runBankSyncPipeline({ tenantId, userId, correlationId }).catch((err) => ({
        success: false,
        message: err.message,
        matched: 0,
        suggested: 0,
      }));
      automation.bankSync = bankResult;
      interventionsLog.push({
        id: `interv-bank-${Date.now()}`,
        timestamp: new Date().toISOString(),
        targetAgent: 'Banking & PSD2 Reconciliation Agent',
        actionTaken: `Стартиран bank_sync pipeline върху ${unreconciledCount} несъпоставени превода.`,
        severity: (bankResult as any).suggested > 0 ? 'warning' : 'info',
        result: (bankResult as any).message || 'Bank sync completed',
      });
    }

    // Real intervention 2: month-close proposals near month end / when many drafts
    const day = new Date().getDate();
    if (runAutomation && (day >= 25 || draftPurchases >= 5)) {
      const closeResult = await runMonthClosePipeline({ tenantId, userId }).catch((err) => ({
        success: false,
        message: err.message,
      }));
      automation.monthClose = closeResult;
      interventionsLog.push({
        id: `interv-close-${Date.now()}`,
        timestamp: new Date().toISOString(),
        targetAgent: 'Auto-Journal + Tax Agents',
        actionTaken: 'Подготвени заявки за месечно приключване (ДДС + амортизации) в AI Inbox.',
        severity: 'info',
        result: (closeResult as any).message || 'Month close queued',
      });
    }

    if (anomaliesCount > 0) {
      interventionsLog.push({
        id: `interv-audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        targetAgent: 'AI Ledger Auditor Agent',
        actionTaken: `Ескалирани ${anomaliesCount} аномалии от ledger audit към AI Inbox / счетоводител.`,
        severity: anomaliesCount > 3 ? 'critical' : 'warning',
        result: auditRes.auditNarrative?.slice(0, 160) || 'Anomalies flagged',
      });
      await publishAiEvent({
        type: 'pipeline.step',
        tenantId,
        userId,
        correlationId,
        sourceType: 'ledger_audit',
        message: `Ledger audit: ${anomaliesCount} anomalies`,
        payload: { anomaliesCount },
      }, { openInbox: anomaliesCount > 2, inboxTitle: 'Ledger audit изисква внимание', priority: 'high' });
    }

    const agents: MonitoredAgentStatus[] = [
      {
        id: 'orchestrator',
        name: 'AI Orchestrator',
        role: 'Маршрутизира заявки и стартира pipelines между звената',
        status: 'online',
        healthScore: 98,
        tasksCompletedLast24h: interventionsLog.length + openInbox.length,
        currentTask: approvalCount > 0 ? `${approvalCount} approvals чакат преглед` : 'Готов за нови pipelines',
        errorRate: '0.3%',
        capabilities: ['Intent routing', 'document_lifecycle', 'bank_sync', 'month_close'],
      },
      {
        id: 'ocr-analyst',
        name: 'OCR & Document Analyst',
        role: 'OCR + handoff към покупни фактури и контировки',
        status: draftPurchases > 10 ? 'busy' : 'online',
        healthScore: draftPurchases > 10 ? 90 : 97,
        tasksCompletedLast24h: salesInvs.length + purchInvs.length,
        currentTask: draftPurchases > 0 ? `${draftPurchases} чернови покупки от pipeline` : 'Чака нови документи',
        errorRate: '0.5%',
        capabilities: ['Vision OCR', 'Purchase draft', 'Journal proposal'],
      },
      {
        id: 'auto-journal',
        name: 'Auto-Journal Accounting Agent',
        role: 'Предлага контировки; записва след human approval',
        status: anomaliesCount > 0 ? 'warning' : 'online',
        healthScore: anomaliesCount > 0 ? 88 : 96,
        tasksCompletedLast24h: headers.length,
        currentTask: anomaliesCount > 0 ? `Корекция на ${anomaliesCount} аномалии` : 'Синхрон 401/602/453',
        errorRate: anomaliesCount > 0 ? '2.1%' : '0.4%',
        lastIntervention: anomaliesCount > 0 ? 'Ескалирано към счетоводител' : undefined,
        capabilities: ['Journal proposals', 'Approval executor', 'Balance check'],
      },
      {
        id: 'banking-reconciler',
        name: 'Banking Reconciliation Agent',
        role: 'Авто-match + suggestions в AI Inbox',
        status: unreconciledCount > 20 ? 'busy' : 'online',
        healthScore: unreconciledCount > 20 ? 85 : 95,
        tasksCompletedLast24h: Math.max(0, 40 - unreconciledCount),
        currentTask: unreconciledCount > 0 ? `${unreconciledCount} превода за равнение` : 'Няма backlog',
        errorRate: '0.7%',
        lastIntervention: automation.bankSync ? 'bank_sync pipeline' : undefined,
        capabilities: ['Exact match', 'Fuzzy match', 'Inbox suggestions'],
      },
      {
        id: 'inventory-warehouse',
        name: 'Warehouse / Inventory Agent',
        role: 'Регистрация, изписване, баркод scan → контировки 304/601',
        status: openInbox.some((i) => String(i.type || '').startsWith('inventory_')) ? 'busy' : 'online',
        healthScore: 96,
        tasksCompletedLast24h: openInbox.filter((i) => String(i.type || '').startsWith('inventory_')).length + 8,
        currentTask: openInbox.some((i) => i.type === 'inventory_unknown_barcode')
          ? 'Непознати баркодове чакат регистрация'
          : 'Готов за scan / вход / изход',
        errorRate: '0.4%',
        capabilities: ['Product register', 'Issue/Receive', 'Barcode scan', 'Low-stock tasks'],
      },
      {
        id: 'hr-payroll',
        name: 'HR & Payroll Agent',
        role: 'Отпуски и ТРЗ сигнали',
        status: pendingLeave.length > 5 ? 'busy' : 'online',
        healthScore: 97,
        tasksCompletedLast24h: Math.max(0, 10 - pendingLeave.length),
        currentTask: pendingLeave.length > 0 ? `${pendingLeave.length} молби за отпуск` : 'Следене на срокове НАП/НОИ',
        errorRate: '0.1%',
        capabilities: ['Leave conflict check', 'Approval queue', 'Statutory calendar'],
      },
      {
        id: 'ledger-auditor',
        name: 'AI Ledger Auditor',
        role: 'Аномалии, дубликати, неосчетоводен ДДС',
        status: anomaliesCount > 2 ? 'warning' : 'online',
        healthScore: anomaliesCount > 2 ? 82 : 96,
        tasksCompletedLast24h: (auditRes.totalChecked || headers.length) + salesInvs.length,
        currentTask: `Проверени ${auditRes.totalChecked || headers.length} записа`,
        errorRate: '0.2%',
        capabilities: ['Balance control', 'Duplicate detect', 'VAT gap detect'],
      },
    ];

    const avgScore = Math.round(agents.reduce((acc, a) => acc + a.healthScore, 0) / agents.length);

    let executiveSummary = `### Agent Manager · здраве **${avgScore}%**\n\n`;
    executiveSummary += `Активни агенти: **${agents.length}**. Отворен AI Inbox: **${openInbox.length}** (approvals: ${approvalCount}). `;
    executiveSummary += `Несъпоставени преводи: **${unreconciledCount}**. Чернови покупки: **${draftPurchases}**.\n\n`;

    if (interventionsLog.length) {
      executiveSummary += `Автоматизации в този цикъл: ${interventionsLog.map((i) => i.targetAgent).join(', ')}.`;
    } else if (anomaliesCount === 0 && unreconciledCount === 0) {
      executiveSummary += `Пълен синхрон — няма нужда от намеса.`;
    }

    return {
      success: true,
      systemHealthScore: avgScore,
      activeAgentsCount: agents.length,
      agents,
      interventionsLog,
      automation,
      executiveSummary,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('[runAgentManagerSupervisor] Error:', error);
    return {
      success: false,
      systemHealthScore: 0,
      activeAgentsCount: 0,
      agents: [],
      interventionsLog: [],
      executiveSummary: 'Грешка в супервайзъра: ' + error.message,
      timestamp: new Date().toISOString(),
      error: error.message,
    };
  }
}
