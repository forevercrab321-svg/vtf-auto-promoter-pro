import { prisma } from "@/lib/db";
import { PageHeader, Tag, EmptyState } from "@/components/ui";
import { AddFindingForm, FindingControls } from "@/components/FindingActions";

export const dynamic = "force-dynamic";

function sevTone(s: string) {
  return s === "CRITICAL" || s === "HIGH" ? "red" : s === "MEDIUM" ? "amber" : "slate";
}
function valTone(s: string) {
  return s === "CONFIRMED" ? "green" : s === "FALSE_POSITIVE" ? "red" : "amber";
}

export default async function FindingsPage() {
  const [findings, programs] = await Promise.all([
    prisma.finding.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        program: { select: { name: true } },
        target: { select: { name: true } },
        _count: { select: { evidence: true, reports: true } },
      },
    }),
    prisma.program.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Findings"
        subtitle="Potential → Confirmed. Only CONFIRMED findings can be marked READY / SUBMITTED. Accurate impact only — no exaggeration."
      >
        {programs.length > 0 && <AddFindingForm programs={programs} />}
      </PageHeader>

      {findings.length === 0 ? (
        <EmptyState title="No findings yet." hint="Log a potential finding, then validate it." />
      ) : (
        <div className="space-y-3">
          {findings.map((f) => (
            <div key={f.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-100">{f.title}</h3>
                  <p className="text-xs text-slate-500">
                    {f.program.name}
                    {f.target ? ` · ${f.target.name}` : ""} · {f.vulnType}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Tag tone={sevTone(f.severity)}>{f.severity}</Tag>
                  <Tag tone={valTone(f.validationState)}>{f.validationState}</Tag>
                  <Tag tone={f.duplicateRisk === "HIGH" ? "red" : f.duplicateRisk === "MEDIUM" ? "amber" : "slate"}>
                    dup: {f.duplicateRisk}
                  </Tag>
                  <Tag tone={f.submissionState === "ACCEPTED" ? "green" : "slate"}>{f.submissionState}</Tag>
                  {f.bountyAmount ? <Tag tone="green">${f.bountyAmount.toLocaleString()}</Tag> : null}
                </div>
              </div>
              {f.summary && <p className="mt-2 text-sm text-slate-400">{f.summary}</p>}
              <div className="mt-3 border-t border-ink-800 pt-3">
                <FindingControls
                  id={f.id}
                  validationState={f.validationState}
                  duplicateRisk={f.duplicateRisk}
                  submissionState={f.submissionState}
                />
                <p className="mt-2 text-[11px] text-slate-500">
                  {f._count.evidence} evidence · {f._count.reports} report(s)
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
