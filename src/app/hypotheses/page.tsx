import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, Tag, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function HypothesesPage() {
  const hypotheses = await prisma.hypothesis.findMany({
    orderBy: { createdAt: "desc" },
    include: { target: { select: { id: true, name: true, safetyState: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Hypotheses"
        subtitle="Testable security hypotheses — no blind scanning. Each states a precondition, expected secure behavior, and a minimum-impact test strategy."
      />
      {hypotheses.length === 0 ? (
        <EmptyState title="No hypotheses yet." hint="Analyze an in-scope target to generate hypotheses." />
      ) : (
        <div className="space-y-3">
          {hypotheses.map((h) => (
            <div key={h.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-100">{h.title}</h3>
                <div className="flex gap-1">
                  <Tag tone="indigo">{h.category}</Tag>
                  <Tag tone={h.riskLevel === "HIGH" ? "red" : h.riskLevel === "MEDIUM" ? "amber" : "slate"}>{h.riskLevel}</Tag>
                  {h.humanApprovalRequired && <Tag tone="amber">human approval</Tag>}
                  <Tag>{h.status}</Tag>
                </div>
              </div>
              <div className="mt-2 grid gap-1 text-xs text-slate-400 md:grid-cols-2">
                <p><span className="text-slate-500">Precondition:</span> {h.precondition}</p>
                <p><span className="text-slate-500">Expected secure:</span> {h.expectedSecureBehavior}</p>
                <p><span className="text-slate-500">Strategy:</span> {h.testStrategy}</p>
                <p><span className="text-slate-500">Impact:</span> {h.potentialImpact}</p>
              </div>
              <div className="mt-2 text-xs">
                <Link href={`/targets/${h.target.id}`} className="text-indigo-300 hover:underline">
                  {h.target.name}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
