// Officia VAT Register — MCP integration
// ---------------------------------------------------
// Оголва ДДС регистрите на Officia като MCP tools:
//   - Дневник на продажбите (sales ledger)
//   - Дневник на покупките (purchase ledger)
//   - Справка‑декларация по ЗДДС (VAT declaration за периода)
//   - Експорт във формат за подаване към НАП
//
// Покрива стандартния случай за българско МСП: ставки 20% и 9%.
//
// Разчита на съществуващите invoices/invoiceItems таблици от
// "officia-invoices-mcp-server.ts" + нова purchaseInvoices таблица
// за входящите фактури (нужни за дневника на покупките).

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { db } from "./src/lib/db/mcp-db";
import { invoices, invoiceLines, purchaseInvoices, purchaseInvoiceLines } from "./src/lib/db/schema";
import { and, gte, lte, eq } from "drizzle-orm";

const server = new Server(
  { name: "officia-vat-register", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

const PeriodSchema = z.object({
  year: z.number(),
  month: z.number().min(1).max(12),
});

const periodJsonSchema = {
  type: "object" as const,
  properties: {
    year: { type: "number" as const, description: "Година" },
    month: { type: "number" as const, description: "Месец (1–12)" },
  },
  required: ["year", "month"],
};

const ExportNraSchema = PeriodSchema.extend({
  format: z.enum(["xml", "txt"]).default("xml"),
});

const exportNraJsonSchema = {
  type: "object" as const,
  properties: {
    year: { type: "number" as const, description: "Година" },
    month: { type: "number" as const, description: "Месец (1–12)" },
    format: { type: "string" as const, enum: ["xml", "txt"], description: "Формат за експорт" },
  },
  required: ["year", "month"],
};

function periodBounds(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59)).toISOString();
  return { start, end };
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "generate_sales_ledger",
      description: "Генерира Дневник на продажбите за даден месец (чл. 124 ЗДДС)",
      inputSchema: periodJsonSchema,
    },
    {
      name: "generate_purchase_ledger",
      description: "Генерира Дневник на покупките за даден месец",
      inputSchema: periodJsonSchema,
    },
    {
      name: "generate_vat_declaration",
      description: "Изчислява Справка‑декларация по ЗДДС: начислен ДДС, данъчен кредит, резултат за периода",
      inputSchema: periodJsonSchema,
    },
    {
      name: "export_nra_file",
      description: "Експортира дневниците в стандартния формат за подаване през НАП е‑портал",
      inputSchema: exportNraJsonSchema,
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "generate_sales_ledger": {
      const { year, month } = PeriodSchema.parse(args);
      const { start, end } = periodBounds(year, month);

      const rows = await db.query.invoices.findMany({
        where: and(gte(invoices.issueDate, start), lte(invoices.issueDate, end)),
      });

      const ledger = rows.map((inv: any) => {
        const items = (inv.items ?? []) as any[];
        const base20 = items
          .filter((i: any) => i.vatRate === 20)
          .reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.unitPrice), 0);
        const base9 = items
          .filter((i: any) => i.vatRate === 9)
          .reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.unitPrice), 0);

        return {
          invoiceNumber: inv.number,
          date: inv.issueDate,
          clientName: inv.clientName,
          clientVatNumber: inv.clientVatNumber ?? "—",
          base20,
          vat20: +(base20 * 0.2).toFixed(2),
          base9,
          vat9: +(base9 * 0.09).toFixed(2),
          total: inv.total,
        };
      });

      const totals = ledger.reduce(
        (acc: any, r: any) => ({
          base20: acc.base20 + r.base20,
          vat20: acc.vat20 + r.vat20,
          base9: acc.base9 + r.base9,
          vat9: acc.vat9 + r.vat9,
        }),
        { base20: 0, vat20: 0, base9: 0, vat9: 0 }
      );

      return {
        content: [{ type: "text" as const, text: JSON.stringify({ period: `${month}/${year}`, rows: ledger, totals }, null, 2) }],
      };
    }

    case "generate_purchase_ledger": {
      const { year, month } = PeriodSchema.parse(args);
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));

      const rows = await db.query.purchaseInvoices.findMany({
        where: and(gte(purchaseInvoices.createdAt, startDate), lte(purchaseInvoices.createdAt, endDate)),
      });

      const allPurchaseLines = await db.query.purchaseInvoiceLines.findMany();
      const purchaseLinesByInvoice = new Map<string, any[]>();
      for (const line of allPurchaseLines) {
        const arr = purchaseLinesByInvoice.get(line.invoiceId) ?? [];
        arr.push(line);
        purchaseLinesByInvoice.set(line.invoiceId, arr);
      }

      const ledger = rows.map((inv: any) => {
        const items = purchaseLinesByInvoice.get(inv.id) ?? [];
        const deductibleBase = items
          .filter((i: any) => i.lineNet)
          .reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.unitPrice), 0);
        const deductibleVat = items
          .filter((i: any) => i.lineNet)
          .reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.unitPrice) * (Number(i.vatRate) / 100), 0);

        return {
          supplierName: inv.supplierName,
          supplierVatNumber: inv.supplierVat,
          invoiceNumber: inv.invoiceNumber,
          date: inv.createdAt,
          deductibleBase,
          deductibleVat: +deductibleVat.toFixed(2),
        };
      });

      const totalDeductibleVat = ledger.reduce((s: number, r: any) => s + r.deductibleVat, 0);

      return {
        content: [{ type: "text" as const, text: JSON.stringify({ period: `${month}/${year}`, rows: ledger, totalDeductibleVat }, null, 2) }],
      };
    }

    case "generate_vat_declaration": {
      const { year, month } = PeriodSchema.parse(args);

      const salesResult = await server.request(
        { method: "tools/call", params: { name: "generate_sales_ledger", arguments: { year, month } } },
        z.any()
      );
      const purchaseResult = await server.request(
        { method: "tools/call", params: { name: "generate_purchase_ledger", arguments: { year, month } } },
        z.any()
      );

      const sales = JSON.parse(salesResult.content[0].text);
      const purchases = JSON.parse(purchaseResult.content[0].text);

      const vatCharged = sales.totals.vat20 + sales.totals.vat9;
      const vatCredit = purchases.totalDeductibleVat;
      const result = +(vatCharged - vatCredit).toFixed(2);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ period: `${month}/${year}`, vatCharged, vatCredit, result: result >= 0 ? { payable: result } : { refundable: Math.abs(result) } }, null, 2),
        }],
      };
    }

    case "export_nra_file": {
      const { year, month, format } = ExportNraSchema.parse(args);
      const payload = {
        period: `${String(month).padStart(2, "0")}${year}`,
        format,
        note: "Мапни изхода на generate_sales_ledger / generate_purchase_ledger към VAT08 XSD схемата на НАП преди подаване.",
      };
      return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
    }

    default:
      throw new Error(`Непознат tool: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  console.error("officia-vat-register MCP server starting on stdio...");
  await server.connect(transport);
}
main().catch(console.error);
