"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Rule {
  id: string;
  kind: string;
  ruleType: string;
  pattern: string;
  ruleSource: string;
}

const RULE_TYPES = ["DOMAIN", "SUBDOMAIN", "WILDCARD", "APP", "API_HOST", "METHOD", "ASSET", "TEST_ACCOUNT"];

export function ProgramTools({ programId, rules }: { programId: string; rules: Rule[] }) {
  const router = useRouter();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ScopeChecker programId={programId} />
      <IssueToken programId={programId} />
      <RuleEditor programId={programId} rules={rules} onChange={() => router.refresh()} />
    </div>
  );
}

function ScopeChecker({ programId }: { programId: string }) {
  const [target, setTarget] = useState("");
  const [technique, setTechnique] = useState("");
  const [result, setResult] = useState<{ status: string; safetyState: string; reason: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function check() {
    setBusy(true);
    setResult(null);
    const res = await fetch("/api/scope/check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ programId, target, plannedTestType: technique }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) setResult(data);
    else setResult({ status: "ERROR", safetyState: "RED", reason: data.error });
  }

  const color =
    result?.safetyState === "GREEN"
      ? "text-green-400"
      : result?.safetyState === "RED"
        ? "text-red-400"
        : "text-yellow-400";

  return (
    <div className="card">
      <h3 className="card-title mb-3">Scope Guardian — check a target</h3>
      <div className="space-y-2">
        <input className="input" placeholder="target host or URL (e.g. api.example.com)" value={target} onChange={(e) => setTarget(e.target.value)} />
        <input className="input" placeholder="planned technique (e.g. IDOR test, or 'DoS' to see a block)" value={technique} onChange={(e) => setTechnique(e.target.value)} />
        <button className="btn" disabled={busy || !target} onClick={check}>
          {busy ? "Checking…" : "Check scope"}
        </button>
      </div>
      {result && (
        <div className="mt-3 rounded-lg border border-ink-700 bg-ink-950 p-3">
          <p className={`text-sm font-bold ${color}`}>
            {result.safetyState} · {result.status.replace(/_/g, " ")}
          </p>
          <p className="mt-1 text-xs text-slate-400">{result.reason}</p>
        </div>
      )}
    </div>
  );
}

function IssueToken({ programId }: { programId: string }) {
  const [target, setTarget] = useState("");
  const [technique, setTechnique] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function issue() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/authorizations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ programId, target, plannedTestType: technique }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setMsg(`✓ Token issued (expires ${new Date(data.token.expiresAt).toLocaleDateString()}).`);
      router.refresh();
    } else {
      setMsg(`✗ ${data.error}`);
    }
  }

  return (
    <div className="card">
      <h3 className="card-title mb-3">Issue Authorization Token</h3>
      <p className="mb-2 text-xs text-slate-500">Only issued when the Scope Guardian returns IN_SCOPE. No token → no testing.</p>
      <div className="space-y-2">
        <input className="input" placeholder="target host or URL" value={target} onChange={(e) => setTarget(e.target.value)} />
        <input className="input" placeholder="planned test type (e.g. authorization test)" value={technique} onChange={(e) => setTechnique(e.target.value)} />
        <button className="btn" disabled={busy || !target || !technique} onClick={issue}>
          {busy ? "…" : "Request token"}
        </button>
      </div>
      {msg && <p className={`mt-3 text-sm ${msg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>{msg}</p>}
    </div>
  );
}

function RuleEditor({ programId, rules, onChange }: { programId: string; rules: Rule[]; onChange: () => void }) {
  const [kind, setKind] = useState("ALLOW");
  const [ruleType, setRuleType] = useState("DOMAIN");
  const [pattern, setPattern] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!pattern.trim()) return;
    setBusy(true);
    await fetch("/api/scope-rules", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ programId, kind, ruleType, pattern }),
    });
    setPattern("");
    setBusy(false);
    onChange();
  }
  async function del(id: string) {
    await fetch("/api/scope-rules", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    onChange();
  }

  return (
    <div className="card lg:col-span-2">
      <h3 className="card-title mb-3">Machine-readable scope ({rules.length} rules)</h3>
      <div className="mb-3 flex flex-wrap gap-2">
        <select className="input w-28" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option>ALLOW</option>
          <option>BLOCK</option>
        </select>
        <select className="input w-40" value={ruleType} onChange={(e) => setRuleType(e.target.value)}>
          {RULE_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <input className="input flex-1" placeholder="pattern (e.g. *.example.com or DoS)" value={pattern} onChange={(e) => setPattern(e.target.value)} />
        <button className="btn-ghost" disabled={busy} onClick={add}>
          + Add rule
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {rules.length === 0 && <p className="text-sm text-slate-500">No confirmed rules. Add ALLOW/BLOCK rules before testing.</p>}
        {rules.map((r) => (
          <span
            key={r.id}
            className={`pill gap-2 ${r.kind === "ALLOW" ? "bg-green-500/15 text-green-300" : "bg-red-500/15 text-red-300"}`}
            title={r.ruleSource}
          >
            {r.kind} · {r.ruleType}: {r.pattern}
            <button className="text-slate-400 hover:text-white" onClick={() => del(r.id)}>
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
