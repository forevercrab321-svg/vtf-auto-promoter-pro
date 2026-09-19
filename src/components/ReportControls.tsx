"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReportControls({ id, status, markdown }: { id: string; status: string; markdown: string }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  async function setStatus(s: string) {
    await fetch(`/api/reports/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: s }),
    });
    router.refresh();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setShow(true);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label className="flex items-center gap-1 text-slate-400">
          Status
          <select
            className="rounded border border-ink-700 bg-ink-950 px-1.5 py-1 text-xs text-slate-200"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {["DRAFT", "HUMAN_REVIEW", "READY_TO_SUBMIT", "SUBMITTED"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <button className="btn-ghost !py-1 !text-xs" onClick={() => setShow((v) => !v)}>
          {show ? "Hide" : "View"} markdown
        </button>
        <button className="btn-ghost !py-1 !text-xs" onClick={copy}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      {show && (
        <pre className="mt-3 max-h-[400px] overflow-auto rounded-lg border border-ink-700 bg-ink-950 p-3 text-xs text-slate-300">
          {markdown}
        </pre>
      )}
    </div>
  );
}
