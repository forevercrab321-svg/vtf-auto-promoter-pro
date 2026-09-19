import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader, PriorityPill, ScopePill, SafetyPill, Tag } from "@/components/ui";
import { ProgramTools } from "@/components/ProgramTools";
import { AddTargetForm } from "@/components/AddTargetForm";
import { parseJsonArray } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ProgramDetail({ params }: { params: { id: string } }) {
  const program = await prisma.program.findUnique({
    where: { id: params.id },
    include: {
      scopeRules: { orderBy: { createdAt: "asc" } },
      targets: { orderBy: { createdAt: "desc" } },
      authorizations: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!program) notFound();

  const intel = safeParse(program.intelligence);
  const prohibited = parseJsonArray(program.prohibitedTesting);

  return (
    <div>
      <PageHeader title={program.name} subtitle={`${program.platform}${program.programUrl ? ` · ${program.programUrl}` : ""}`}>
        <PriorityPill priority={program.priority} />
        <Link href="/programs" className="btn-ghost">
          ← All programs
        </Link>
      </PageHeader>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="stat">
          <div className="stat-value">{program.opportunityScore ?? "—"}</div>
          <div className="stat-label">Opportunity score</div>
        </div>
        <div className="stat">
          <div className="stat-value">{program.maxBounty ? `$${program.maxBounty.toLocaleString()}` : "—"}</div>
          <div className="stat-label">Max bounty</div>
        </div>
        <div className="stat">
          <div className="stat-value">{program.scopeRules.length}</div>
          <div className="stat-label">Scope rules</div>
        </div>
        <div className="stat">
          <div className="stat-value">{program.automatedTestingAllowed ? "Yes" : "No"}</div>
          <div className="stat-label">Automated testing allowed</div>
        </div>
      </div>

      {Array.isArray(intel?.rationale) && (
        <div className="card mb-6">
          <h3 className="card-title mb-2">Program Intelligence rationale</h3>
          <ul className="space-y-1 text-sm text-slate-300">
            {(intel.rationale as string[]).map((r, i) => (
              <li key={i}>• {r}</li>
            ))}
          </ul>
          {prohibited.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              <span className="text-xs text-slate-500">Program-prohibited:</span>
              {prohibited.map((p) => (
                <Tag key={p} tone="red">
                  {p}
                </Tag>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mb-6">
        <ProgramTools programId={program.id} rules={program.scopeRules} />
      </div>

      <div className="mb-6">
        <AddTargetForm programId={program.id} />
      </div>

      <div className="card">
        <h3 className="card-title mb-3">Targets ({program.targets.length})</h3>
        {program.targets.length === 0 ? (
          <p className="text-sm text-slate-500">No targets yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Target</th>
                <th>Type</th>
                <th>Scope</th>
                <th>Safety</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {program.targets.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link href={`/targets/${t.id}`} className="text-indigo-300 hover:underline">
                      {t.name}
                    </Link>
                    {t.url && <div className="text-xs text-slate-500">{t.url}</div>}
                  </td>
                  <td className="text-slate-300">{t.targetType}</td>
                  <td>
                    <ScopePill status={t.scopeStatus} />
                  </td>
                  <td>
                    <SafetyPill state={t.safetyState} />
                  </td>
                  <td>
                    <PriorityPill priority={t.priority} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function safeParse(s: string): Record<string, unknown> | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
