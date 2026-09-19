import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader, ScopePill, SafetyPill, PriorityPill, Tag } from "@/components/ui";
import { AnalyzeButton, CreateTestForm } from "@/components/TargetTools";

export const dynamic = "force-dynamic";

export default async function TargetDetail({ params }: { params: { id: string } }) {
  const target = await prisma.target.findUnique({
    where: { id: params.id },
    include: {
      program: true,
      attackSurfaces: { orderBy: { priority: "asc" } },
      hypotheses: { orderBy: { createdAt: "desc" } },
      tests: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!target) notFound();

  const authorizations = await prisma.authorizationToken.findMany({
    where: { programId: target.programId, status: "ACTIVE" },
    select: { id: true, target: true, status: true },
    orderBy: { createdAt: "desc" },
  });

  const inScope = target.scopeStatus === "IN_SCOPE";

  return (
    <div>
      <PageHeader title={target.name} subtitle={target.url || target.program.name}>
        <ScopePill status={target.scopeStatus} />
        <SafetyPill state={target.safetyState} />
        <PriorityPill priority={target.priority} />
        <Link href={`/programs/${target.programId}`} className="btn-ghost">
          ← Program
        </Link>
      </PageHeader>

      <div className="mb-4 rounded-lg border border-ink-700 bg-ink-900/60 p-3 text-sm text-slate-400">
        <span className="font-semibold text-slate-300">Scope Guardian:</span> {target.scopeReason}
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <AnalyzeButton targetId={target.id} inScope={inScope} />
        <CreateTestForm
          targetId={target.id}
          hypotheses={target.hypotheses.map((h) => ({ id: h.id, title: h.title }))}
          authorizations={authorizations}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h3 className="card-title mb-3">Attack surface ({target.attackSurfaces.length})</h3>
          {target.attackSurfaces.length === 0 ? (
            <p className="text-sm text-slate-500">Run analysis to map the attack surface.</p>
          ) : (
            <ul className="space-y-2">
              {target.attackSurfaces.map((s) => (
                <li key={s.id} className="rounded-lg border border-ink-800 p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-200">{s.category}</span>
                    <Tag tone={s.priority === "HIGH" ? "red" : s.priority === "MEDIUM" ? "amber" : "slate"}>{s.priority}</Tag>
                  </div>
                  <p className="text-xs text-slate-400">{s.component}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{s.rationale}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h3 className="card-title mb-3">Hypotheses ({target.hypotheses.length})</h3>
          {target.hypotheses.length === 0 ? (
            <p className="text-sm text-slate-500">Run analysis to generate testable hypotheses.</p>
          ) : (
            <ul className="space-y-2">
              {target.hypotheses.map((h) => (
                <li key={h.id} className="rounded-lg border border-ink-800 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-200">{h.title}</span>
                    <Tag tone={h.riskLevel === "HIGH" ? "red" : h.riskLevel === "MEDIUM" ? "amber" : "slate"}>{h.riskLevel}</Tag>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    <span className="text-slate-400">Expected secure:</span> {h.expectedSecureBehavior}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    <span className="text-slate-400">Strategy:</span> {h.testStrategy}
                  </p>
                  {h.humanApprovalRequired && <Tag tone="amber">human approval</Tag>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card mt-6">
        <h3 className="card-title mb-3">Planned tests ({target.tests.length})</h3>
        {target.tests.length === 0 ? (
          <p className="text-sm text-slate-500">No tests planned. All tests are Supervisor-gated.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Planned action</th>
              </tr>
            </thead>
            <tbody>
              {target.tests.map((t) => (
                <tr key={t.id}>
                  <td className="text-slate-200">{t.title}</td>
                  <td>
                    <Tag
                      tone={
                        t.status === "AUTHORIZED" || t.status === "READY"
                          ? "green"
                          : t.status === "HUMAN_APPROVAL_REQUIRED"
                            ? "amber"
                            : "red"
                      }
                    >
                      {t.status}
                    </Tag>
                  </td>
                  <td className="text-slate-400">{t.plannedAction || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
