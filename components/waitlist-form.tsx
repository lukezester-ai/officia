"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function WaitlistForm() {
  const t = useTranslations("WaitlistForm");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "landing" }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || t("errorMessage"));
      }

      setStatus("success");
      setMessage(payload.message || t("successMessage"));
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : t("errorMessage"));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 grid gap-3 sm:grid-cols-[1fr_auto]">
      <input
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder={t("emailPlaceholder")}
        className="h-14 rounded-2xl border border-white/10 bg-white px-4 text-sm font-semibold text-slate-950 outline-none ring-indigo-300 transition placeholder:text-slate-400 focus:ring-4"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="h-14 rounded-2xl bg-indigoElectric px-6 text-sm font-bold text-white transition hover:bg-white hover:text-navy disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "loading" ? t("buttonLoading") : t("buttonIdle")}
      </button>
      {message ? (
        <p
          className={`sm:col-span-2 rounded-2xl border px-4 py-3 text-sm font-semibold ${
            status === "success"
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
              : "border-rose-400/30 bg-rose-400/10 text-rose-100"
          }`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}

