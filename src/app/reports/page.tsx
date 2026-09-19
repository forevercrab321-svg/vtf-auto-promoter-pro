import { prisma } from "@/lib/db";
import { PageHeader, Tag, EmptyState } from "@/components/ui";
import { ReportControls } from "@/components/ReportControls";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const reports = await prisma.report.findMany({
    orderBy: { updatedAt: "desc" },
    include: { program: { select: { name: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Drafted in the standard bug-bounty structure. Every report requires human review before submission — verify claims and keep impact accurate."
      />
      {reports.length === 0 ? (
        <EmptyState title="No reports yet." hint="On the Findings page, validate a finding then click “Draft report”." />
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-100">{r.title}</h3>
                  <p className="text-xs text-slate-500">{r.program.name}</p>
                </div>
                <Tag
                  tone={
                    r.status === "READY_TO_SUBMIT" ? "green" : r.status === "SUBMITTED" ? "indigo" : "amber"
                  }
                >
                  {r.status}
                </Tag>
              </div>
              <div className="mt-3 border-t border-ink-800 pt-3">
                <ReportControls id={r.id} status={r.status} markdown={r.markdown} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
