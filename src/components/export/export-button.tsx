// @ts-nocheck
"use client";
import { useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";

function toCSV(data: Record<string, any>[]): string {
  if (!data.length) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const v = String(row[h] ?? "").replace(/"/g, '""');
      return v.includes(",") || v.includes("\n") || v.includes('"') ? `"${v}"` : v;
    }).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

type ExportButtonProps = {
  data: Record<string, any>[];
  filename?: string;
  label?: string;
};

export function ExportButton({ data, filename = "export", label = "Експорт" }: ExportButtonProps) {
  const [open, setOpen] = useState(false);

  const csv = () => {
    const content = "\uFEFF" + toCSV(data);
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const pdf = () => { window.print(); setOpen(false); };

  return (
    <div className="relative">
      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative z-20 flex items-center gap-2 bg-white/5 hover:bg-white/8 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 text-sm text-zinc-400 hover:text-white transition-all"
      >
        <Download size={14} /> {label}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 bg-zinc-800 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 min-w-[160px]">
          <button onClick={csv} className="w-full px-4 py-3 text-left text-sm text-zinc-300 hover:bg-white/8 hover:text-white transition-colors flex items-center gap-2.5">
            <FileSpreadsheet size={15} className="text-emerald-400" /> Excel (CSV)
          </button>
          <div className="h-px bg-white/5" />
          <button onClick={pdf} className="w-full px-4 py-3 text-left text-sm text-zinc-300 hover:bg-white/8 hover:text-white transition-colors flex items-center gap-2.5">
            <FileText size={15} className="text-red-400" /> PDF (Печат)
          </button>
        </div>
      )}
    </div>
  );
}
