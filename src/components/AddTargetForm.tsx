"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProgramOpt {
  id: string;
  name: string;
}

export function AddTargetForm({ programId, programs }: { programId?: string; programs?: ProgramOpt[] }) {
  const router = useRouter();
  const [pid, setPid] = useState(programId ?? programs?.[0]?.id ?? "");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState("web");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!pid || !name.trim()) {
      setMsg("Program and target name are required.");
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/targets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ programId: pid, name, url: url || undefined, targetType: type }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setMsg(`Added — Scope Guardian verdict: ${data.decision.safetyState} (${data.decision.status.replace(/_/g, " ")}).`);
      setName("");
      setUrl("");
      router.refresh();
    } else {
      setMsg(data.error || "Error");
    }
  }

  return (
    <div className="card">
      <h3 className="card-title mb-3">Add a target</h3>
      <div className="grid gap-2 md:grid-cols-2">
        {!programId && programs && (
          <select className="input md:col-span-2" value={pid} onChange={(e) => setPid(e.target.value)}>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <input className="input" placeholder="target name (e.g. Main API)" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder="url / host (e.g. api.example.com)" value={url} onChange={(e) => setUrl(e.target.value)} />
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="web">web</option>
          <option value="api">api</option>
          <option value="mobile">mobile</option>
          <option value="source">source</option>
        </select>
        <button className="btn" disabled={busy} onClick={submit}>
          {busy ? "…" : "Add target"}
        </button>
      </div>
      {msg && <p className="mt-2 text-sm text-indigo-300">{msg}</p>}
    </div>
  );
}
