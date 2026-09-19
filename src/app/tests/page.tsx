import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, Tag, SafetyPill, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

function statusTone(s: string) {
  if (s === "AUTHORIZED" || s === "READY" || s === "EXECUTED") return "green";
  if (s === "HUMAN_APPROVAL_REQUIRED") return "amber";
  return "red";
}

export default async function TestsPage() {
  const tests = await prisma.safeTest.findMany({
    orderBy: { createdAt: "desc" },
    include: { target: { select: { id: true, name: true, safetyState: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Tests"
        subtitle="Safe, minimum-impact test plans. Every test is gated: valid Authorization Token + Scope Guardian IN_SCOPE + Security Supervisor ALLOW. This system tracks intent and results; it does not run attacks for you."
      />
      {tests.length === 0 ? (
        <EmptyState title="No test plans yet." hint="Open a target and plan a Supervisor-gated test." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Test</th>
                <th>Target</th>
                <th>Safety</th>
                <th>Status</th>
                <th>Planned action</th>
                <th>Potential impact</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.id}>
                  <td className="text-slate-200">{t.title}</td>
                  <td>
                    <Link href={`/targets/${t.target.id}`} className="text-indigo-300 hover:underline">
                      {t.target.name}
                    </Link>
                  </td>
                  <td>
                    <SafetyPill state={t.target.safetyState} />
                  </td>
                  <td>
                    <Tag tone={statusTone(t.status)}>{t.status}</Tag>
                  </td>
                  <td className="text-slate-400">{t.plannedAction || "—"}</td>
                  <td className="text-slate-400">{t.potentialImpact || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
