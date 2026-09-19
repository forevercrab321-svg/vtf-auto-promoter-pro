"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLATFORMS } from "@/lib/types";

export function AddProgramForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    platform: "HackerOne",
    programUrl: "",
    maxBounty: "",
    scopeSize: "",
    apiAvailable: false,
    wildcardScope: false,
    publicProgram: true,
    sourceCodeAvailable: false,
    automatedTestingAllowed: false,
    safeHarbor: false,
    policyText: "",
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    if (!form.name.trim()) {
      setMsg("Program name is required.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/programs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          platform: form.platform,
          programUrl: form.programUrl || undefined,
          maxBounty: form.maxBounty ? Number(form.maxBounty) : null,
          scopeSize: form.scopeSize ? Number(form.scopeSize) : 0,
          apiAvailable: form.apiAvailable,
          wildcardScope: form.wildcardScope,
          publicProgram: form.publicProgram,
          sourceCodeAvailable: form.sourceCodeAvailable,
          automatedTestingAllowed: form.automatedTestingAllowed,
          safeHarbor: form.safeHarbor,
          policyText: form.policyText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const warns: string[] = data.warnings || [];
      setMsg(
        `Added. Scope Guardian proposed ${data.proposedRules?.length ?? 0} rule(s).` +
          (warns.length ? ` ⚠ ${warns.length} warning(s) — confirm scope manually.` : ""),
      );
      setForm((f) => ({ ...f, name: "", programUrl: "", maxBounty: "", scopeSize: "", policyText: "" }));
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="btn" onClick={() => setOpen(true)}>
        + Add program
      </button>
    );
  }

  return (
    <div className="card mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="card-title">Add / import an authorized program</h3>
        <button className="text-sm text-slate-400 hover:text-slate-200" onClick={() => setOpen(false)}>
          close
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="label">Program name *</label>
          <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Acme Corp Public Bounty" />
        </div>
        <div>
          <label className="label">Platform</label>
          <select className="input" value={form.platform} onChange={(e) => set("platform", e.target.value)}>
            {PLATFORMS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Program URL</label>
          <input className="input" value={form.programUrl} onChange={(e) => set("programUrl", e.target.value)} placeholder="https://hackerone.com/acme" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Max bounty ($)</label>
            <input className="input" type="number" value={form.maxBounty} onChange={(e) => set("maxBounty", e.target.value)} />
          </div>
          <div>
            <label className="label">In-scope assets (#)</label>
            <input className="input" type="number" value={form.scopeSize} onChange={(e) => set("scopeSize", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <Check label="Public program" v={form.publicProgram} on={(v) => set("publicProgram", v)} />
        <Check label="Wildcard scope" v={form.wildcardScope} on={(v) => set("wildcardScope", v)} />
        <Check label="API in scope" v={form.apiAvailable} on={(v) => set("apiAvailable", v)} />
        <Check label="Source available" v={form.sourceCodeAvailable} on={(v) => set("sourceCodeAvailable", v)} />
        <Check label="Automated testing allowed" v={form.automatedTestingAllowed} on={(v) => set("automatedTestingAllowed", v)} />
        <Check label="Safe harbor" v={form.safeHarbor} on={(v) => set("safeHarbor", v)} />
      </div>

      <div className="mt-3">
        <label className="label">Program policy text (paste the scope / rules)</label>
        <textarea
          className="input min-h-[120px] font-mono text-xs"
          value={form.policyText}
          onChange={(e) => set("policyText", e.target.value)}
          placeholder={"In scope:\n*.example.com\napi.example.com\n\nOut of scope:\nblog.example.com\n\nProhibited: DoS, social engineering"}
        />
        <p className="mt-1 text-[11px] text-slate-500">
          The Scope Guardian parses this into candidate ALLOW/BLOCK rules. Always confirm them before testing.
        </p>
      </div>

      {msg && <p className="mt-3 text-sm text-indigo-300">{msg}</p>}
      <div className="mt-4 flex gap-2">
        <button className="btn" disabled={busy} onClick={submit}>
          {busy ? "Saving…" : "Save program"}
        </button>
      </div>
    </div>
  );
}

function Check({ label, v, on }: { label: string; v: boolean; on: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-slate-300">
      <input type="checkbox" checked={v} onChange={(e) => on(e.target.checked)} className="accent-indigo-500" />
      {label}
    </label>
  );
}
