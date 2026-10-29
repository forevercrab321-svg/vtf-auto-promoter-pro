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
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Select
          label="Validation"
          value={validationState}
          options={["POTENTIAL", "LIKELY", "UNCERTAIN", "FALSE_POSITIVE"]}
          onChange={(v) => patch({ validationState: v })}
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
      <ValidatePanel id={id} />
    </div>
  );
}

// Proof-required validation panel. CONFIRMED can only be reached here, not via
// the dropdown above — this is the acceptance-rate / low-duplicate moat.
function ValidatePanel({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    independentReproductions: 0,
    authorizationContextValid: false,
    differentialSignal: false,
    minimumProofEvidence: false,
    environmentalNoiseRuledOut: false,
    businessImpactArticulated: false,
  });
  const [res, setRes] = useState<{
    verdict: string;
    gaps: string[];
    met: string[];
    unmet: string[];
    duplicate?: { risk: string; queries: { label: string; url: string }[]; rationale: string } | null;
  } | null>(null);

  async function run() {
    setBusy(true);
    const r = await fetch(`/api/findings/${id}/validate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(f),
    });
    const data = await r.json();
    setBusy(false);
    if (r.ok) {
      setRes({ ...data.validation, duplicate: data.duplicate });
      router.refresh();
    }
  }

  const flags: [keyof typeof f, string][] = [
    ["authorizationContextValid", "tested in authorized scope, own accounts"],
    ["differentialSignal", "clear allowed-vs-denied / expected-vs-actual contrast"],
    ["minimumProofEvidence", "minimal redacted evidence captured"],
    ["environmentalNoiseRuledOut", "WAF/cache/rate-limit noise ruled out"],
    ["businessImpactArticulated", "concrete, non-exaggerated impact"],
  ];

  const tone =
    res?.verdict === "CONFIRMED"
      ? "text-green-400"
      : res?.verdict === "FALSE_POSITIVE"
        ? "text-red-400"
        : "text-yellow-400";

  return (
    <div className="rounded-lg border border-ink-800 bg-ink-950/40 p-2">
      <button className="text-xs font-medium text-indigo-300 hover:text-indigo-200" onClick={() => setOpen((v) => !v)}>
        {open ? "▾" : "▸"} Validate (proof-required)
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2 text-xs text-slate-300">
            Independent reproductions
            <input
              type="number"
              min={0}
              className="w-16 rounded border border-ink-700 bg-ink-950 px-1.5 py-1 text-xs"
              value={f.independentReproductions}
              onChange={(e) => setF({ ...f, independentReproductions: Number(e.target.value) })}
            />
            <span className="text-slate-500">(CONFIRMED needs ≥ 2)</span>
          </label>
          <div className="flex flex-col gap-1">
            {flags.map(([k, label]) => (
              <label key={k} className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  className="accent-indigo-500"
                  checked={f[k] as boolean}
                  onChange={(e) => setF({ ...f, [k]: e.target.checked })}
                />
                {label}
              </label>
            ))}
          </div>
          <button className="btn !py-1 !text-xs" disabled={busy} onClick={run}>
            {busy ? "…" : "Run proof-required validation"}
          </button>

          {res && (
            <div className="mt-2 rounded border border-ink-700 bg-ink-950 p-2 text-xs">
              <p className={`font-bold ${tone}`}>Verdict: {res.verdict}</p>
              {res.unmet?.length > 0 && (
                <>
                  <p className="mt-1 text-slate-400">Open criteria:</p>
                  <ul className="text-slate-400">
                    {res.gaps.map((g, i) => (
                      <li key={i}>• {g}</li>
                    ))}
                  </ul>
                </>
              )}
              {res.duplicate && (
                <div className="mt-2 border-t border-ink-800 pt-2">
                  <p className="text-slate-400">
                    Duplicate risk: <span className="text-slate-200">{res.duplicate.risk}</span> — run these before submitting:
                  </p>
                  <ul>
                    {res.duplicate.queries.map((q, i) => (
                      <li key={i}>
                        <a className="text-indigo-300 hover:underline" href={q.url} target="_blank" rel="noreferrer">
                          {q.label} ↗
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
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
