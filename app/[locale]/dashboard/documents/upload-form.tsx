"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, UploadCloud } from "lucide-react";
import { createDocumentAction } from "./actions";

type UploadState = "idle" | "signing" | "uploading" | "saving" | "success" | "error";

export function DocumentUploadForm({ createdMessage, createdStatus }: { createdMessage: string | null; createdStatus?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [message, setMessage] = useState<string | null>(createdMessage);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const fileEntry = formData.get("file");
    const file = fileEntry instanceof File ? fileEntry : null;

    if (!file || file.size === 0) {
      setState("error");
      setMessage("Choose a file to upload.");
      return;
    }

    try {
      setState("signing");
      setMessage("Preparing secure upload...");

      const signedResponse = await fetch("/api/documents/signed-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileType: file.type || "application/octet-stream", fileSize: file.size }),
      });

      const signedPayload = await signedResponse.json();

      if (!signedResponse.ok) {
        throw new Error(typeof signedPayload?.error === "string" ? signedPayload.error : "Could not create upload URL.");
      }

      setState("uploading");
      setMessage("Uploading document to Supabase Storage...");

      if (typeof signedPayload.signedUrl !== "string") {
        throw new Error("Supabase did not return a signed upload URL.");
      }

      const uploadUrl = signedPayload.signedUrl;
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed. Check the Supabase Storage bucket and policies.");
      }

      const metadata = new FormData();
      metadata.set("fileName", file.name);
      metadata.set("fileType", file.type || "application/octet-stream");
      metadata.set("storagePath", signedPayload.storagePath);
      metadata.set("aiSummary", String(formData.get("aiSummary") || ""));

      setState("saving");
      setMessage("Saving document record...");

      startTransition(() => {
        createDocumentAction(metadata);
      });
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    }
  }

  const busy = state === "signing" || state === "uploading" || state === "saving" || isPending;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-6 grid gap-4">
      {message ? (
        <div className={`rounded-2xl px-4 py-3 text-sm font-bold ${state === "error" || createdStatus === "error" || createdStatus === "database-not-ready" || createdStatus === "missing-fields" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
          {message}
        </div>
      ) : null}
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        File
        <input name="file" type="file" required className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none ring-indigo-200 file:mr-4 file:rounded-xl file:border-0 file:bg-indigoElectric file:px-4 file:py-2 file:text-sm file:font-bold file:text-white focus:ring-4" />
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        AI summary
        <textarea name="aiSummary" rows={4} placeholder="Optional short document summary..." className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none ring-indigo-200 focus:ring-4" />
      </label>
      <button type="submit" disabled={busy} className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-indigoElectric px-5 text-sm font-bold text-white shadow-glow transition hover:bg-navy disabled:cursor-not-allowed disabled:opacity-60">
        {busy ? <UploadCloud size={16} /> : <Plus size={16} />} {busy ? "Uploading..." : "Upload and save document"}
      </button>
    </form>
  );
}
