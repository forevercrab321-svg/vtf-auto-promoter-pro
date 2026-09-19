import Link from "next/link";
import { computeMetrics } from "@/lib/metrics";
import { buildBrief } from "@/lib/brief";
import { AGENTS, PIPELINE } from "@/lib/agents";
import { CORE_PRINCIPLES } from "@/lib/types";
import { Stat, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [m, brief] = await Promise.all([computeMetrics(), buildBrief()]);

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="A guarded operating system for authorized bug bounty research. Optimises Expected Research Value — not scan volume."
      >
        <Link href="/programs" className="btn">
          + Add program
        </Link>
      </PageHeader>

      {/* Safety banner */}
      <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-xs text-indigo-200">
        {CORE_PRINCIPLES.map((p) => (
          <span key={p} className="pill bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-500/30">
            {p}
          </span>
        ))}
      </div>

      {/* Key stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <Stat label="Active programs" value={m.programsTracked} hint={`${m.priorityA} Priority A`} />
        <Stat label="Targets in scope" value={m.targetsInScope} />
        <Stat label="Potential findings" value={m.potentialFindings} />
        <Stat label="Confirmed findings" value={m.confirmedFindings} />
        <Stat label="Reports ready" value={m.reportsReady} />
        <Stat label="Accepted reports" value={m.accepted} />
        <Stat label="Total rewards" value={`$${m.totalRewards.toLocaleString()}`} />
        <Stat label="Acceptance rate" value={`${m.acceptanceRate}%`} />
        <Stat label="Duplicate rate" value={`${m.duplicateRate}%`} />
        <Stat label="Pending approvals" value={m.pendingApprovals} hint="Human gate" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Daily brief */}
        <section className="card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="card-title">Daily Security Research Brief</h2>
            <span className="text-xs text-slate-500">{brief.date}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm md:grid-cols-3">
            <BriefRow label="Programs analyzed" value={brief.programsAnalyzed} />
            <BriefRow label="Targets prioritized" value={brief.targetsPrioritized} />
            <BriefRow label="Surfaces mapped" value={brief.attackSurfacesMapped} />
            <BriefRow label="Hypotheses" value={brief.hypothesesGenerated} />
            <BriefRow label="Tests completed" value={brief.testsCompleted} />
            <BriefRow label="Potential findings" value={brief.potentialFindings} />
            <BriefRow label="Confirmed" value={brief.confirmedFindings} />
            <BriefRow label="Reports ready" value={brief.reportsReady} />
            <BriefRow label="Accepted" value={brief.acceptedReports} />
          </div>
          <div className="mt-4 border-t border-ink-800 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Next highest-value actions
            </p>
            <ul className="space-y-1 text-sm text-slate-300">
              {brief.nextActions.map((a, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-indigo-400">▸</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Pipeline */}
        <section className="card">
          <h2 className="card-title mb-3">Research Pipeline</h2>
          <ol className="space-y-1 text-xs">
            {PIPELINE.map((s, i) => (
              <li
                key={i}
                className={`flex items-center justify-between rounded px-2 py-1 ${
                  s.human ? "bg-amber-500/10 text-amber-200" : "text-slate-400"
                }`}
              >
                <span>
                  {String(i + 1).padStart(2, "0")}. {s.stage}
                </span>
                <span className="text-[10px] text-slate-500">{s.agent}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* Agent team */}
      <section className="card mt-6">
        <h2 className="card-title mb-3">Agent Team (orchestrated by the Security Supervisor)</h2>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {AGENTS.map((a) => (
            <div key={a.id} className="rounded-lg border border-ink-800 bg-ink-950/60 p-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-500">{a.code}</span>
                <span className="text-sm font-semibold text-slate-200">{a.name}</span>
                {a.gatekeeper && (
                  <span className="pill bg-red-500/15 text-red-300 ring-1 ring-red-500/30">gate</span>
                )}
                {a.deterministic && !a.gatekeeper && (
                  <span className="pill bg-slate-700/40 text-slate-400">rule engine</span>
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{a.role}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function BriefRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-800/60 py-1">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-200">{value}</span>
    </div>
  );
}
