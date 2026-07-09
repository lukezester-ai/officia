export type DomainEvent = {
  type: 'invoice:created';
  tenantId: string;
  payload: { invoiceId: string; clientName: string; total: string };
} | {
  type: 'invoice:paid';
  tenantId: string;
  payload: { invoiceId: string; paidAmount: string };
} | {
  type: 'journal:posted';
  tenantId: string;
  payload: { journalId: string; journalNumber: string; total: string };
} | {
  type: 'bank:transactions-synced';
  tenantId: string;
  payload: { accountId: string; importedCount: number };
} | {
  type: 'bank:transaction-matched';
  tenantId: string;
  payload: { transactionId: string; invoiceId: string };
} | {
  type: 'leave:approved';
  tenantId: string;
  payload: { leaveRequestId: string; employeeId: string };
} | {
  type: 'leave:cancelled';
  tenantId: string;
  payload: { leaveRequestId: string; employeeId: string };
} | {
  type: 'period:closed';
  tenantId: string;
  payload: { year: number; month: number };
} | {
  type: 'period:reopened';
  tenantId: string;
  payload: { year: number; month: number };
} | {
  type: 'document:uploaded';
  tenantId: string;
  payload: { documentId: string; fileName: string };
} | {
  type: 'payroll:batch-approved';
  tenantId: string;
  payload: { batchId: string; period: string };
} | {
  type: 'vat:journals-generated';
  tenantId: string;
  payload: { year: number; month: number };
};

export type EventHandler = (event: DomainEvent) => Promise<void>;
