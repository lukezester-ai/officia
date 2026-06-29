"use client";
import { useState } from "react";
import { Plus, FileText, Building2, Receipt, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

const ACTIONS = [
  { label: "Нова фактура", href: "/dashboard/invoices?new=1", Icon: Receipt, color: "from-indigo-500 to-violet-600" },
  { label: "Документи", href: "/dashboard/documents", Icon: FileText, color: "from-blue-500 to-cyan-600" },
  { label: "Контрагенти", href: "/dashboard/counterparties", Icon: Building2, color: "from-emerald-500 to-teal-600" },
  { label: "Покупки", href: "/dashboard/purchase-invoices", Icon: ShoppingCart, color: "from-amber-500 to-orange-600" },
];

export function FloatingFAB() {
  const [open, setOpen] = useState(false);
  const params = useParams();
  const lang = params.lang as string;
  return (
    <div className="fixed bottom-24 right-6 z-50 flex-col items-end gap-3" style={{display:'flex'}}>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          {ACTIONS.map((a) => (
            <Link key={a.label} href={`/${lang}${a.href}`} onClick={() => setOpen(false)} className="flex items-center gap-3 group">
              <span className="bg-zinc-800 border border-white/10 text-xs text-white px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">{a.label}</span>
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${a.color} flex items-center justify-center shadow-lg transition-transform hover:scale-110`}>
                <a.Icon size={18} className="text-white" />
              </div>
            </Link>
          ))}
        </>
      )}
      <button onClick={() => setOpen(!open)} className={`w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center shadow-xl shadow-indigo-500/30 transition-all hover:scale-110 ${open ? '  rotate-45' : ''}`}>
        <Plus size={24} className="text-white transition-transform" />
      </button>
    </div>
  );
}
