"use client";

import { Printer } from "lucide-react";

export function InvoicePrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-indigoElectric px-5 text-sm font-bold text-white shadow-glow transition hover:bg-navy print:hidden"
    >
      <Printer size={16} /> Print / Save PDF
    </button>
  );
}