"use client";
import { ReportExporter } from "@/lib/accounting/report-exporter";
import { Download } from "lucide-react";

interface ExportButtonsProps {
  data: any;
  reportType: "balance" | "pnl";
  period: string;
}

export function ExportButtons({ data, reportType, period }: ExportButtonsProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => ReportExporter.exportToExcel(data, reportType, period)}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-600/30 transition-all text-sm font-medium"
      >
        <Download size={16} /> Excel
      </button>
      <button
        onClick={() => ReportExporter.exportToPDF(data, reportType, period, "Officia Company")}
        className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 border border-red-500/30 rounded-xl hover:bg-red-600/30 transition-all text-sm font-medium"
      >
        <Download size={16} /> PDF
      </button>
    </div>
  );
}
