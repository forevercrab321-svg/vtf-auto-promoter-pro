"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface HypOpt {
  id: string;
  title: string;
}
interface AuthOpt {
  id: string;
  target: string;
  status: string;
}

export function AnalyzeButton({ targetId, inScope }: { targetId: string; inScope: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [opts, setOpts] = useState({ hasApi: true, hasGraphql: false, hasOrgs: true, hasAi: false, hasPayments: false });

  async function run() {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/targets/${targetId}/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(opts),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setMsg(`Mapped ${data.surfaces.length} surfaces and generated ${data.hypotheses} hypotheses. Priority ${data.priority}.`);
      router.refresh();
    } else setMsg(data.error);
  }

  if (!inScope) {
    return (
      <div className="card">
        <h3 className="card-title mb-2">Attack Surface + Hypotheses</h3>
        <p className="text-sm text-red-400">
          Analysis is disabled — this target is not IN_SCOPE. Confirm scope with the Scope Guardian first.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="card-title mb-3">Map attack surface + generate hypotheses</h3>
      <div className="mb-3 flex flex-wrap gap-4 text-sm">
        {(["hasApi", "hasGraphql", "hasOrgs", "hasAi", "hasPayments"] as const).map((k) => (
          <label key={k} className="flex cursor-pointer items-center gap-2 text-slate-300">
            <input
              type="checkbox"
              className="accent-indigo-500"
              checked={opts[k]}
              onChange={(e) => setOpts((o) => ({ ...o, [k]: e.target.checked }))}
            />
            {k.replace("has", "")}
          </label>
        ))}
      </div>
      <button className="btn" disabled={busy} onClick={run}>
        {busy ? "Analyzing…" : "Run analysis"}
      </button>
      {msg && <p className="mt-2 text-sm text-indigo-300">{msg}</p>}
    </div>
  );
}

export function CreateTestForm({
  targetId,
  hypotheses,
  authorizations,
}: {
  targetId: string;
  hypotheses: HypOpt[];
  authorizations: AuthOpt[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; verdict: string } | null>(null);
  const [f, setF] = useState({
    title: "",
    plannedAction: "",
    potentialImpact: "",
    hypothesisId: "",
    authorizationId: "",
    rateSafe: true,
    couldAffectOtherUsers: false,
    couldReadOthersData: false,
    couldModifyOrDestroyData: false,
    couldDisruptService: false,
    couldIncurCost: false,
    couldSendMessages: false,
    couldCreateManyResources: false,
  });

  async function submit() {
    if (!f.title.trim()) {
      setMsg({ text: "Test title required.", verdict: "BLOCK" });
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/tests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        targetId,
        title: f.title,
        plannedAction: f.plannedAction,
        potentialImpact: f.potentialImpact,
        hypothesisId: f.hypothesisId || undefined,
        authorizationId: f.authorizationId || undefined,
        rateSafe: f.rateSafe,
        couldAffectOtherUsers: f.couldAffectOtherUsers,
        couldReadOthersData: f.couldReadOthersData,
        couldModifyOrDestroyData: f.couldModifyOrDestroyData,
        couldDisruptService: f.couldDisruptService,
        couldIncurCost: f.couldIncurCost,
        couldSendMessages: f.couldSendMessages,
        couldCreateManyResources: f.couldCreateManyResources,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setMsg({ text: `Supervisor verdict: ${data.status}.`, verdict: data.supervisor.verdict });
      router.refresh();
    } else setMsg({ text: data.error, verdict: "BLOCK" });
  }

  const flags: [keyof typeof f, string][] = [
    ["couldAffectOtherUsers", "affects other users"],
    ["couldReadOthersData", "reads others' data"],
    ["couldModifyOrDestroyData", "modifies/destroys data"],
    ["couldDisruptService", "disrupts service"],
    ["couldIncurCost", "incurs cost"],
    ["couldSendMessages", "sends email/SMS"],
    ["couldCreateManyResources", "creates many resources"],
  ];

  return (
    <div className="card">
      <h3 className="card-title mb-3">Plan a safe test (Supervisor-gated)</h3>
      <div className="space-y-2">
        <input className="input" placeholder="test title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <input className="input" placeholder="planned action (minimum-impact)" value={f.plannedAction} onChange={(e) => setF({ ...f, plannedAction: e.target.value })} />
        <input className="input" placeholder="potential impact" value={f.potentialImpact} onChange={(e) => setF({ ...f, potentialImpact: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <select className="input" value={f.hypothesisId} onChange={(e) => setF({ ...f, hypothesisId: e.target.value })}>
            <option value="">(link a hypothesis)</option>
            {hypotheses.map((h) => (
              <option key={h.id} value={h.id}>
                {h.title.slice(0, 50)}
              </option>
            ))}
          </select>
          <select className="input" value={f.authorizationId} onChange={(e) => setF({ ...f, authorizationId: e.target.value })}>
            <option value="">(attach authorization token)</option>
            {authorizations.map((a) => (
              <option key={a.id} value={a.id}>
                {a.target} · {a.status}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-3">
        <p className="label">This test could… (checking any sensitive box routes to Human Approval)</p>
        <div className="flex flex-wrap gap-3 text-xs">
          {flags.map(([k, label]) => (
            <label key={k} className="flex cursor-pointer items-center gap-1.5 text-slate-300">
              <input
                type="checkbox"
                className="accent-red-500"
                checked={f[k] as boolean}
                onChange={(e) => setF({ ...f, [k]: e.target.checked })}
              />
              {label}
            </label>
          ))}
          <label className="flex cursor-pointer items-center gap-1.5 text-slate-300">
            <input type="checkbox" className="accent-green-500" checked={f.rateSafe} onChange={(e) => setF({ ...f, rateSafe: e.target.checked })} />
            rate is safe
          </label>
        </div>
      </div>
      <button className="btn mt-3" disabled={busy} onClick={submit}>
        {busy ? "…" : "Run Supervisor gate"}
      </button>
      {msg && (
        <p
          className={`mt-2 text-sm ${
            msg.verdict === "ALLOW" ? "text-green-400" : msg.verdict === "HUMAN_APPROVAL_REQUIRED" ? "text-yellow-400" : "text-red-400"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
