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
import { z } from "zod";
import { db } from "./db";
import { invoices, invoiceItems, purchaseInvoices, purchaseInvoiceItems } from "./schema";
import { and, gte, lte } from "drizzle-orm";

const server = new Server(
  { name: "officia-vat-register", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ---- Данъчни ставки, валидни в България ----
// 20% стандартна, 9% намалена (хотелиерство, хляб и др.)

const PeriodInput = z.object({
  year: z.number(),
  month: z.number().min(1).max(12), // ДДС период = календарен месец в БГ
});

const GenerateDeclarationInput = PeriodInput;

const ExportNraInput = PeriodInput.extend({
  format: z.enum(["xml", "txt"]).default("xml"),
});

// ---- Помощна функция: граници на периода ----
function periodBounds(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59)).toISOString();
  return { start, end };
}

server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "generate_sales_ledger",
      description: "Генерира Дневник на продажбите за даден месец (чл. 124 ЗДДС)",
      inputSchema: PeriodInput,
    },
    {
      name: "generate_purchase_ledger",
      description: "Генерира Дневник на покупките за даден месец",
      inputSchema: PeriodInput,
    },
    {
      name: "generate_vat_declaration",
      description: "Изчислява Справка‑декларация по ЗДДС: начислен ДДС, данъчен кредит, резултат за периода",
      inputSchema: GenerateDeclarationInput,
    },
    {
      name: "export_nra_file",
      description: "Експортира дневниците в стандартния формат за подаване през НАП е‑портал",
      inputSchema: ExportNraInput,
    },
  ],
}));

server.setRequestHandler("tools/call", async (req) => {
  const { name, arguments: args } = req.params;

  switch (name) {
    case "generate_sales_ledger": {
      const { year, month } = PeriodInput.parse(args);
      const { start, end } = periodBounds(year, month);

      const rows = await db.query.invoices.findMany({
        where: and(gte(invoices.issueDate, start), lte(invoices.issueDate, end)),
        with: { items: true },
      });

      const ledger = rows.map((inv) => {
        const base20 = inv.items
          .filter((i) => i.vatRate === 20)
          .reduce((s, i) => s + i.quantity * i.unitPrice, 0);
        const base9 = inv.items
          .filter((i) => i.vatRate === 9)
          .reduce((s, i) => s + i.quantity * i.unitPrice, 0);

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
        (acc, r) => ({
          base20: acc.base20 + r.base20,
          vat20: acc.vat20 + r.vat20,
          base9: acc.base9 + r.base9,
          vat9: acc.vat9 + r.vat9,
        }),
        { base20: 0, vat20: 0, base9: 0, vat9: 0 }
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ period: `${month}/${year}`, rows: ledger, totals }, null, 2),
          },
        ],
      };
    }

    case "generate_purchase_ledger": {
      const { year, month } = PeriodInput.parse(args);
      const { start, end } = periodBounds(year, month);

      const rows = await db.query.purchaseInvoices.findMany({
        where: and(gte(purchaseInvoices.receivedDate, start), lte(purchaseInvoices.receivedDate, end)),
        with: { items: true },
      });

      const ledger = rows.map((inv) => {
        const deductibleBase = inv.items
          .filter((i) => i.vatDeductible)
          .reduce((s, i) => s + i.quantity * i.unitPrice, 0);
        const deductibleVat = inv.items
          .filter((i) => i.vatDeductible)
          .reduce((s, i) => s + i.quantity * i.unitPrice * (i.vatRate / 100), 0);

        return {
          supplierName: inv.supplierName,
          supplierVatNumber: inv.supplierVatNumber,
          invoiceNumber: inv.supplierInvoiceNumber,
          date: inv.receivedDate,
          deductibleBase,
          deductibleVat: +deductibleVat.toFixed(2),
          fullTaxCredit: inv.fullTaxCredit, // право на пълен данъчен кредит
        };
      });

      const totalDeductibleVat = ledger.reduce((s, r) => s + r.deductibleVat, 0);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ period: `${month}/${year}`, rows: ledger, totalDeductibleVat }, null, 2),
          },
        ],
      };
    }

    case "generate_vat_declaration": {
      const { year, month } = GenerateDeclarationInput.parse(args);

      // Използва двата предходни tool‑а вътрешно
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
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                period: `${month}/${year}`,
                vatCharged,
                vatCredit,
                result: result >= 0 ? { payable: result } : { refundable: Math.abs(result) },
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "export_nra_file": {
      const { year, month, format } = ExportNraInput.parse(args);
      // Реалният НАП формат (VAT08) е фиксирана XML структура —
      // тук връщаме скеле, което после се мапва 1:1 към официалната схема
      const payload = {
        period: `${String(month).padStart(2, "0")}${year}`,
        format,
        note: "Мапни изхода на generate_sales_ledger / generate_purchase_ledger към VAT08 XSD схемата на НАП преди подаване.",
      };
      return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
    }

    default:
      throw new Error(`Непознат tool: ${name}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
