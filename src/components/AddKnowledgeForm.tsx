"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  "Program",
  "Asset",
  "Technology",
  "AuthModel",
  "FindingPattern",
  "FalsePositive",
  "Duplicate",
  "Lesson",
];

export function AddKnowledgeForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ category: "Lesson", title: "", body: "", tags: "" });

  async function submit() {
    if (!f.title.trim()) return;
    setBusy(true);
    await fetch("/api/knowledge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        category: f.category,
        title: f.title,
        body: f.body,
        tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    });
    setBusy(false);
    setF({ category: "Lesson", title: "", body: "", tags: "" });
    setOpen(false);
    router.refresh();
  }

  if (!open) return <button className="btn" onClick={() => setOpen(true)}>+ Add entry</button>;

  return (
    <div className="card mb-6">
      <h3 className="card-title mb-3">Add knowledge entry</h3>
      <div className="grid gap-2 md:grid-cols-2">
        <select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input className="input" placeholder="title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <textarea className="input md:col-span-2" placeholder="body / notes" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
        <input className="input md:col-span-2" placeholder="tags (comma separated)" value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} />
      </div>
      <div className="mt-3 flex gap-2">
        <button className="btn" disabled={busy} onClick={submit}>{busy ? "…" : "Save"}</button>
        <button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}
