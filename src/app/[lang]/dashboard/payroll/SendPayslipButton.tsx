"use client";

import { useState } from "react";
import { Mail, Loader2, CheckCircle, X } from "lucide-react";
import { sendPayslipEmail } from "./send-payslip";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position?: string;
  gross: number;
  doo: number;
  dzpo: number;
  zzo: number;
  tax: number;
  net: number;
}

interface SendPayslipButtonProps {
  employee: Employee;
}

export function SendPayslipButton({ employee }: SendPayslipButtonProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSend = async () => {
    if (!email.includes("@")) return;
    setStatus("loading");
    const res = await sendPayslipEmail(email, employee);
    if (res.success) {
      setStatus("success");
      setTimeout(() => { setOpen(false); setStatus("idle"); setEmail(""); }, 2500);
    } else {
      setStatus("error");
      setErrorMsg(res.error || "Грешка при изпращане");
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Изпрати фиш по имейл"
        className="flex items-center gap-1 text-xs text-indigo-400 border border-indigo-500/20 px-2.5 py-1.5 rounded-lg hover:bg-indigo-500/10 transition-all"
      >
        <Mail size={12} /> Фиш
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-semibold text-lg">Изпрати Фиш за Заплата</div>
                <div className="text-zinc-500 text-sm">{employee.firstName} {employee.lastName}</div>
              </div>
              <button onClick={() => { setOpen(false); setStatus("idle"); }} className="text-zinc-600 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Preview */}
            <div className="rounded-xl bg-black/40 border border-white/5 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Бруто</span>
                <span className="text-violet-400 font-semibold tabular-nums">{employee.gross.toFixed(2)} лв</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-600">Удръжки (осиг. + ДОД)</span>
                <span className="text-rose-400 tabular-nums">− {(employee.doo + employee.dzpo + employee.zzo + employee.tax).toFixed(2)} лв</span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-2 mt-1">
                <span className="text-white font-bold">НЕТО</span>
                <span className="text-emerald-400 font-black text-base tabular-nums">{employee.net.toFixed(2)} лв</span>
              </div>
            </div>

            {/* Email input */}
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 uppercase tracking-wider">Имейл на служителя</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="ivan@example.com"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all"
                disabled={status === "loading" || status === "success"}
              />
            </div>

            {/* Status messages */}
            {status === "error" && (
              <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                {errorMsg}
              </div>
            )}
            {status === "success" && (
              <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                <CheckCircle size={15} /> Фишът е изпратен успешно!
              </div>
            )}

            {/* Send button */}
            {status !== "success" && (
              <button
                onClick={handleSend}
                disabled={!email.includes("@") || status === "loading"}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all"
              >
                {status === "loading" ? (
                  <><Loader2 size={16} className="animate-spin" /> Изпращане...</>
                ) : (
                  <><Mail size={16} /> Изпрати фиш по имейл</>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
