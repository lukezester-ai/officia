"use client";

import { useState } from "react";
import { Download, Loader2, Building2 } from "lucide-react";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position?: string | null;
  net: number;
}


interface BatchPaymentExportProps {
  employees: Employee[];
  totalNet: number;
}

export function BatchPaymentExport({ employees, totalNet }: BatchPaymentExportProps) {
  const [loading, setLoading] = useState(false);

  const generateCSV = () => {
    setLoading(true);
    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString("bg-BG").replace(/\//g, "-");

      // CSV header (compatible with most Bulgarian banks)
      const rows = [
        ["Получател", "IBAN", "Сума (BGN)", "Валута", "Основание", "Дата"].join(";"),
        ...employees.map((emp) => [
          `${emp.firstName} ${emp.lastName}`,
          "", // IBAN - to be filled by accountant
          emp.net.toFixed(2).replace(".", ","),
          "BGN",
          `Заплата ${now.toLocaleDateString("bg-BG", { month: "long", year: "numeric" })} - ${emp.position || "Служител"}`,
          dateStr,
        ].join(";")),
        // Totals row
        ["ОБЩО", "", totalNet.toFixed(2).replace(".", ","), "BGN", "", ""].join(";"),
      ];

      const csvContent = "\uFEFF" + rows.join("\r\n"); // BOM for Excel Bulgarian
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `zaplatna-vedomost-${dateStr}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  const generateBankXML = () => {
    setLoading(true);
    try {
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];

      // PAIN.001 simplified format (used by some BG banks)
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<PaymentFile>
  <Header>
    <Date>${dateStr}</Date>
    <Currency>BGN</Currency>
    <TotalAmount>${totalNet.toFixed(2)}</TotalAmount>
    <PaymentsCount>${employees.length}</PaymentsCount>
    <Description>Заплати ${now.toLocaleDateString("bg-BG", { month: "long", year: "numeric" })}</Description>
  </Header>
  <Payments>
${employees
  .map(
    (emp) => `    <Payment>
      <Beneficiary>${emp.firstName} ${emp.lastName}</Beneficiary>
      <IBAN></IBAN>
      <Amount>${emp.net.toFixed(2)}</Amount>
      <Currency>BGN</Currency>
      <Reason>Заплата - ${emp.position || "Служител"}</Reason>
    </Payment>`
  )
  .join("\n")}
  </Payments>
</PaymentFile>`;

      const blob = new Blob([xml], { type: "application/xml;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bank-payments-${dateStr}.xml`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  if (employees.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="bg-black/20 px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Банков Export — Заплати</h2>
        </div>
        <span className="text-xs text-zinc-500 bg-white/5 px-3 py-1 rounded-full border border-white/10">
          {employees.length} превода · {totalNet.toLocaleString("bg-BG", { minimumFractionDigits: 2 })} лв
        </span>
      </div>

      <div className="p-6 space-y-4">
        <p className="text-sm text-zinc-400">
          Генерирайте файл за масово изплащане на заплати. Попълнете IBAN-овете и качете файла директно в интернет банкирането.
        </p>

        {/* Employee preview */}
        <div className="rounded-xl border border-white/5 bg-black/20 divide-y divide-white/5 max-h-48 overflow-y-auto">
          {employees.map((emp) => (
            <div key={emp.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <div>
                <span className="text-white font-medium">{emp.firstName} {emp.lastName}</span>
                {emp.position && <span className="text-zinc-600 ml-2 text-xs">{emp.position}</span>}
              </div>
              <span className="text-emerald-400 font-bold tabular-nums">
                {emp.net.toLocaleString("bg-BG", { minimumFractionDigits: 2 })} лв
              </span>
            </div>
          ))}
        </div>

        {/* Export buttons */}
        <div className="flex gap-3">
          <button
            onClick={generateCSV}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 font-medium text-sm py-3 rounded-xl transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            Изтегли CSV (Excel)
          </button>
          <button
            onClick={generateBankXML}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 font-medium text-sm py-3 rounded-xl transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            Изтегли XML (Банков)
          </button>
        </div>

        <div className="text-xs text-zinc-600 flex items-center gap-1">
          ⓘ Форматът е съвместим с UniCredit Bulbank, DSK, ОББ и Fibank internet banking.
        </div>
      </div>
    </div>
  );
}
