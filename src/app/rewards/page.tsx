import { computeMetrics } from "@/lib/metrics";
import { prisma } from "@/lib/db";
import { PageHeader, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  const [m, programROI] = await Promise.all([
    computeMetrics(),
    prisma.finding.groupBy({
      by: ["programId"],
      _sum: { bountyAmount: true },
      _count: { _all: true },
      where: { submissionState: "ACCEPTED" },
    }),
  ]);

  const programs = await prisma.program.findMany({
    where: { id: { in: programROI.map((p) => p.programId) } },
    select: { id: true, name: true },
  });
  const nameOf = (id: string) => programs.find((p) => p.id === id)?.name ?? id;

  return (
    <div>
      <PageHeader
        title="Rewards / ROI"
        subtitle="Efficiency and acceptance-quality signals. The goal is to raise Expected Research Value — not to promise revenue or maximise request volume."
      />

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total rewards" value={`$${m.totalRewards.toLocaleString()}`} />
        <Stat label="Reward / research hour" value={`$${m.rewardPerHour.toLocaleString()}`} hint={`${m.researchHours}h logged`} />
        <Stat label="Acceptance rate" value={`${m.acceptanceRate}%`} />
        <Stat label="Duplicate rate" value={`${m.duplicateRate}%`} />
        <Stat label="Average reward" value={`$${m.averageReward.toLocaleString()}`} hint="per accepted" />
        <Stat label="Accepted" value={m.accepted} />
        <Stat label="Duplicate" value={m.duplicate} />
        <Stat label="Informative / N/A" value={m.informative + m.na} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="card-title mb-3">Funnel</h2>
          <div className="space-y-2 text-sm">
            <FunnelRow label="Hypotheses generated" value={m.hypotheses} />
            <FunnelRow label="Tests planned" value={m.testsPlanned} />
            <FunnelRow label="Potential findings" value={m.potentialFindings} />
            <FunnelRow label="Confirmed findings" value={m.confirmedFindings} />
            <FunnelRow label="Reports ready" value={m.reportsReady} />
            <FunnelRow label="Reports submitted" value={m.reportsSubmitted} />
            <FunnelRow label="Accepted" value={m.accepted} highlight />
          </div>
        </section>

        <section className="card">
          <h2 className="card-title mb-3">Program ROI (accepted findings)</h2>
          {programROI.length === 0 ? (
            <p className="text-sm text-slate-500">No accepted findings yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Program</th>
                  <th>Accepted</th>
                  <th>Reward</th>
                </tr>
              </thead>
              <tbody>
                {programROI
                  .sort((a, b) => (b._sum.bountyAmount ?? 0) - (a._sum.bountyAmount ?? 0))
                  .map((p) => (
                    <tr key={p.programId}>
                      <td className="text-slate-200">{nameOf(p.programId)}</td>
                      <td className="text-slate-300">{p._count._all}</td>
                      <td className="text-green-400">${(p._sum.bountyAmount ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

function FunnelRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-ink-800 px-3 py-2">
      <span className="text-slate-400">{label}</span>
      <span className={`font-semibold ${highlight ? "text-green-400" : "text-slate-200"}`}>{value}</span>
    </div>
  );
}
