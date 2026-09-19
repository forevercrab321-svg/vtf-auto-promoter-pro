"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProgramOpt {
  id: string;
  name: string;
}

export function AddFindingForm({ programs }: { programs: ProgramOpt[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    programId: programs[0]?.id ?? "",
    title: "",
    vulnType: "Authorization",
    severity: "MEDIUM",
    summary: "",
    businessImpact: "",
  });

  async function submit() {
    if (!f.programId || !f.title.trim()) return;
    setBusy(true);
    await fetch("/api/findings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(f),
    });
    setBusy(false);
    setF({ ...f, title: "", summary: "", businessImpact: "" });
    setOpen(false);
    router.refresh();
  }

  if (!open) return <button className="btn" onClick={() => setOpen(true)}>+ Log finding</button>;

  return (
    <div className="card mb-6">
      <h3 className="card-title mb-3">Log a potential finding</h3>
      <div className="grid gap-2 md:grid-cols-2">
        <select className="input" value={f.programId} onChange={(e) => setF({ ...f, programId: e.target.value })}>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input className="input" placeholder="title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <input className="input" placeholder="vulnerability type" value={f.vulnType} onChange={(e) => setF({ ...f, vulnType: e.target.value })} />
        <select className="input" value={f.severity} onChange={(e) => setF({ ...f, severity: e.target.value })}>
          {["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <input className="input md:col-span-2" placeholder="summary" value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} />
        <input className="input md:col-span-2" placeholder="business impact (accurate, not exaggerated)" value={f.businessImpact} onChange={(e) => setF({ ...f, businessImpact: e.target.value })} />
      </div>
      <div className="mt-3 flex gap-2">
        <button className="btn" disabled={busy} onClick={submit}>{busy ? "…" : "Save"}</button>
        <button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}

export function FindingControls({
  id,
  validationState,
  duplicateRisk,
  submissionState,
}: {
  id: string;
  validationState: string;
  duplicateRisk: string;
  submissionState: string;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/findings/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg(null);
      router.refresh();
    }
  }

  async function genReport() {
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ findingId: id }),
    });
    if (res.ok) {
      setMsg("Report drafted → Reports page.");
      router.refresh();
    } else setMsg((await res.json()).error);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <Select
        label="Validation"
        value={validationState}
        options={["POTENTIAL", "LIKELY", "UNCERTAIN", "CONFIRMED", "FALSE_POSITIVE"]}
        onChange={(v) => patch({ validationState: v, reproducible: v === "CONFIRMED" })}
      />
      <Select
        label="Dup risk"
        value={duplicateRisk}
        options={["UNKNOWN", "LOW", "MEDIUM", "HIGH"]}
        onChange={(v) => patch({ duplicateRisk: v })}
      />
      <Select
        label="Submission"
        value={submissionState}
        options={["DRAFT", "READY", "SUBMITTED", "ACCEPTED", "DUPLICATE", "INFORMATIVE", "NA"]}
        onChange={(v) => patch({ submissionState: v })}
      />
      <button className="btn-ghost !py-1 !text-xs" onClick={genReport}>
        Draft report
      </button>
      {msg && <span className="text-red-400">{msg}</span>}
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-1 text-slate-400">
      {label}
      <select
        className="rounded border border-ink-700 bg-ink-950 px-1.5 py-1 text-xs text-slate-200"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
