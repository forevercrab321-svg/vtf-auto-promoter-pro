import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, ScopePill, SafetyPill, PriorityPill, EmptyState } from "@/components/ui";
import { AddTargetForm } from "@/components/AddTargetForm";

export const dynamic = "force-dynamic";

export default async function TargetsPage() {
  const [targets, programs] = await Promise.all([
    prisma.target.findMany({
      orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
      include: {
        program: { select: { name: true } },
        _count: { select: { attackSurfaces: true, hypotheses: true, findings: true } },
      },
    }),
    prisma.program.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Targets"
        subtitle="Prioritized research units. Each target carries a cached Scope Guardian verdict (GREEN / YELLOW / RED)."
      />
      {programs.length > 0 && (
        <div className="mb-6">
          <AddTargetForm programs={programs} />
        </div>
      )}

      {targets.length === 0 ? (
        <EmptyState title="No targets yet." hint="Add a program first, then add targets to it." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Target</th>
                <th>Program</th>
                <th>Scope</th>
                <th>Safety</th>
                <th>Priority</th>
                <th>Surfaces</th>
                <th>Hypotheses</th>
              </tr>
            </thead>
            <tbody>
              {targets.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link href={`/targets/${t.id}`} className="text-indigo-300 hover:underline">
                      {t.name}
                    </Link>
                    {t.url && <div className="text-xs text-slate-500">{t.url}</div>}
                  </td>
                  <td className="text-slate-300">{t.program.name}</td>
                  <td>
                    <ScopePill status={t.scopeStatus} />
                  </td>
                  <td>
                    <SafetyPill state={t.safetyState} />
                  </td>
                  <td>
                    <PriorityPill priority={t.priority} />
                  </td>
                  <td className="text-slate-300">{t._count.attackSurfaces}</td>
                  <td className="text-slate-300">{t._count.hypotheses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
