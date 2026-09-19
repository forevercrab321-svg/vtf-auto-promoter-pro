// Small presentational helpers shared across pages.
import React from "react";

export function SafetyPill({ state }: { state: string }) {
  const map: Record<string, string> = {
    GREEN: "bg-green-500/15 text-green-400 ring-1 ring-green-500/30",
    YELLOW: "bg-yellow-500/15 text-yellow-400 ring-1 ring-yellow-500/30",
    RED: "bg-red-500/15 text-red-400 ring-1 ring-red-500/30",
  };
  return <span className={`pill ${map[state] ?? "bg-slate-600/30 text-slate-300"}`}>{state}</span>;
}

export function ScopePill({ status }: { status: string }) {
  const map: Record<string, string> = {
    IN_SCOPE: "bg-green-500/15 text-green-400 ring-1 ring-green-500/30",
    OUT_OF_SCOPE: "bg-red-500/15 text-red-400 ring-1 ring-red-500/30",
    SCOPE_UNKNOWN: "bg-yellow-500/15 text-yellow-400 ring-1 ring-yellow-500/30",
  };
  return <span className={`pill ${map[status] ?? "bg-slate-600/30 text-slate-300"}`}>{status.replace(/_/g, " ")}</span>;
}

export function PriorityPill({ priority }: { priority?: string | null }) {
  if (!priority) return <span className="pill bg-slate-600/30 text-slate-300">—</span>;
  const map: Record<string, string> = {
    A: "bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/40",
    B: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30",
    C: "bg-slate-600/30 text-slate-300",
  };
  return <span className={`pill ${map[priority] ?? ""}`}>Priority {priority}</span>;
}

export function Tag({ children, tone = "slate" }: { children: React.ReactNode; tone?: string }) {
  const map: Record<string, string> = {
    slate: "bg-slate-700/40 text-slate-300",
    indigo: "bg-indigo-500/15 text-indigo-300",
    amber: "bg-amber-500/15 text-amber-300",
    green: "bg-green-500/15 text-green-400",
    red: "bg-red-500/15 text-red-400",
  };
  return <span className={`pill ${map[tone] ?? map.slate}`}>{children}</span>;
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {hint && <div className="mt-1 text-[11px] text-slate-500">{hint}</div>}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-ink-700 p-8 text-center">
      <p className="text-slate-300">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-400">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
