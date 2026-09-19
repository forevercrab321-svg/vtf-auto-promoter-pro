import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, PriorityPill, EmptyState, Tag } from "@/components/ui";
import { AddProgramForm } from "@/components/AddProgramForm";

export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
  const programs = await prisma.program.findMany({
    orderBy: [{ opportunityScore: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { targets: true, findings: true, scopeRules: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Programs"
        subtitle="Authorized Bug Bounty / VDP programs, ranked by Expected Research Value (not just max bounty)."
      />
      <AddProgramForm />

      {programs.length === 0 ? (
        <EmptyState title="No programs yet." hint="Add an authorized program to begin. Seed demo data with: npm run db:seed" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Program</th>
                <th>Platform</th>
                <th>Priority</th>
                <th>Score</th>
                <th>Max bounty</th>
                <th>Scope rules</th>
                <th>Targets</th>
                <th>Findings</th>
              </tr>
            </thead>
            <tbody>
              {programs.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/programs/${p.id}`} className="font-medium text-indigo-300 hover:underline">
                      {p.name}
                    </Link>
                    <div className="mt-1 flex gap-1">
                      {p.wildcardScope && <Tag tone="amber">wildcard</Tag>}
                      {p.apiAvailable && <Tag tone="indigo">API</Tag>}
                      {p.sourceCodeAvailable && <Tag tone="green">source</Tag>}
                      {p.safeHarbor && <Tag tone="green">safe harbor</Tag>}
                    </div>
                  </td>
                  <td className="text-slate-300">{p.platform}</td>
                  <td>
                    <PriorityPill priority={p.priority} />
                  </td>
                  <td className="text-slate-300">{p.opportunityScore ?? "—"}</td>
                  <td className="text-slate-300">{p.maxBounty ? `$${p.maxBounty.toLocaleString()}` : "—"}</td>
                  <td className="text-slate-300">{p._count.scopeRules}</td>
                  <td className="text-slate-300">{p._count.targets}</td>
                  <td className="text-slate-300">{p._count.findings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
