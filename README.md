# Officia MENA — المكتب الذكي

**Modern ERP + AI office software for small and mid-size businesses in the Middle East & North Africa.**

Officia MENA combines accounting, invoicing, inventory, HR, and document management with AI — Arabic-first UI, RTL layout, and AED pricing.

---

## Features

- **Accounting** — Chart of accounts, journals, VAT books, balance sheet, P&L
- **Invoicing** — Sales and purchase invoices
- **Documents + AI** — Upload PDF/photos → AI extraction → review before posting
- **Banking** — Statement import and AI matching
- **Inventory** — Products, barcode scan, issue/receive
- **HR & Payroll** — Employees, leave, payroll
- **Dashboard** — Live KPIs and reports

### Stack
- **Next.js 15** (App Router) + TypeScript + Tailwind
- **Clerk** — auth and multi-tenant
- **Drizzle ORM** + PostgreSQL
- **Anthropic Claude** — documents and analysis

### Locales
- **Arabic (`ar`)** — default, RTL
- **English (`en`)** — LTR
- Currency display: **AED**

---

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you will be redirected to `/ar`.

---

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | ESLint |

---

## Notes

This product foundation is Arabic/MENA-first (routing, dictionaries, RTL, landing, AED). Backend modules may still evolve for regional tax/compliance.
