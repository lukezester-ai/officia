import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoiceLineItems, invoices } from "@/lib/db/schema";

export type InvoiceListState = {
  status: "ready" | "preview" | "error";
  message: string;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    clientName: string;
    status: "draft" | "sent" | "paid" | "overdue" | "void";
    currency: string;
    subtotal: string;
    tax: string;
    total: string;
    dueDate: Date | null;
    createdAt: Date;
  }>;
};

export type InvoiceDetail = InvoiceListState["invoices"][number] & {
  clientEmail: string | null;
  lineItems: Array<{
    id: string;
    description: string;
    quantity: string;
    unitPrice: string;
    taxRate: string;
    lineTotal: string;
    sortOrder: number;
  }>;
};

const previewInvoiceDetails: InvoiceDetail[] = [
  {
    id: "preview-1",
    invoiceNumber: "INV-2048",
    clientName: "ACME Logistics",
    clientEmail: "finance@acme.example",
    status: "sent",
    currency: "EUR",
    subtotal: "2366.67",
    tax: "473.33",
    total: "2840.00",
    dueDate: new Date("2026-02-14T00:00:00.000Z"),
    createdAt: new Date("2026-01-28T00:00:00.000Z"),
    lineItems: [
      { id: "preview-line-1", description: "Monthly accounting services", quantity: "1.00", unitPrice: "1800.00", taxRate: "20.00", lineTotal: "2160.00", sortOrder: 0 },
      { id: "preview-line-2", description: "VAT report preparation", quantity: "1.00", unitPrice: "566.67", taxRate: "20.00", lineTotal: "680.00", sortOrder: 1 },
    ],
  },
  {
    id: "preview-2",
    invoiceNumber: "INV-2049",
    clientName: "Northwind Foods",
    clientEmail: "accounts@northwind.example",
    status: "paid",
    currency: "EUR",
    subtotal: "1050.00",
    tax: "210.00",
    total: "1260.00",
    dueDate: new Date("2026-02-20T00:00:00.000Z"),
    createdAt: new Date("2026-01-29T00:00:00.000Z"),
    lineItems: [
      { id: "preview-line-3", description: "Payroll document processing", quantity: "3.00", unitPrice: "250.00", taxRate: "20.00", lineTotal: "900.00", sortOrder: 0 },
      { id: "preview-line-4", description: "Supplier invoice reconciliation", quantity: "1.00", unitPrice: "300.00", taxRate: "20.00", lineTotal: "360.00", sortOrder: 1 },
    ],
  },
];

const previewInvoices: InvoiceListState["invoices"] = previewInvoiceDetails.map(({ lineItems, clientEmail, ...invoice }) => invoice);

export async function listWorkspaceInvoices(workspaceId: string | null): Promise<InvoiceListState> {
  if (!workspaceId || !db) {
    return {
      status: "preview",
      message: "Invoices are shown in preview mode until DATABASE_URL and workspace bootstrap are ready.",
      invoices: previewInvoices,
    };
  }

  try {
    const rows = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        clientName: invoices.clientName,
        status: invoices.status,
        currency: invoices.currency,
        subtotal: invoices.subtotal,
        tax: invoices.tax,
        total: invoices.total,
        dueDate: invoices.dueDate,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .where(eq(invoices.workspaceId, workspaceId))
      .orderBy(desc(invoices.createdAt));

    return {
      status: "ready",
      message: rows.length ? "Loaded from Supabase." : "No invoices yet. Create your first invoice.",
      invoices: rows,
    };
  } catch (error) {
    console.error("Failed to list invoices:", error);
    return {
      status: "error",
      message: "Could not load invoices. Check DATABASE_URL and run supabase-app-schema.sql.",
      invoices: previewInvoices,
    };
  }
}

export async function getWorkspaceInvoiceDetail(workspaceId: string | null, invoiceId: string): Promise<InvoiceDetail | null> {
  const preview = previewInvoiceDetails.find((invoice) => invoice.id === invoiceId) || null;

  if (!workspaceId || !db) {
    return preview;
  }

  try {
    const [invoice] = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        clientName: invoices.clientName,
        clientEmail: invoices.clientEmail,
        status: invoices.status,
        currency: invoices.currency,
        subtotal: invoices.subtotal,
        tax: invoices.tax,
        total: invoices.total,
        dueDate: invoices.dueDate,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.workspaceId, workspaceId)))
      .limit(1);

    if (!invoice) return null;

    const rows = await db
      .select({
        id: invoiceLineItems.id,
        description: invoiceLineItems.description,
        quantity: invoiceLineItems.quantity,
        unitPrice: invoiceLineItems.unitPrice,
        taxRate: invoiceLineItems.taxRate,
        lineTotal: invoiceLineItems.lineTotal,
        sortOrder: invoiceLineItems.sortOrder,
      })
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, invoice.id))
      .orderBy(asc(invoiceLineItems.sortOrder));

    return { ...invoice, lineItems: rows };
  } catch (error) {
    console.error("Failed to load invoice detail:", error);
    return preview;
  }
}
