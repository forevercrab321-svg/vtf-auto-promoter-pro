import { prisma } from "@/lib/db";
import { PageHeader, Tag, EmptyState } from "@/components/ui";
import { ApprovalControls } from "@/components/ApprovalControls";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const approvals = await prisma.approval.findMany({ orderBy: { createdAt: "desc" } });
  const pending = approvals.filter((a) => a.status === "PENDING");
  const decided = approvals.filter((a) => a.status !== "PENDING");

  return (
    <div>
      <PageHeader
        title="Approvals"
        subtitle="Human Approval Gate. Sensitive actions (reading others' data, modifying data, cost, messaging, disruption, unclear scope) stop here until a human decides."
      />

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Pending ({pending.length})
      </h2>
      {pending.length === 0 ? (
        <EmptyState title="Nothing pending." hint="Supervisor-gated tests that touch sensitive conditions appear here." />
      ) : (
        <div className="space-y-3">
          {pending.map((a) => (
            <div key={a.id} className="card border-amber-500/30">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-100">{a.potentialFinding || a.plannedAction || a.subjectType}</h3>
                <Tag tone="amber">PENDING</Tag>
              </div>
              <div className="mt-2 grid gap-1 text-xs text-slate-400 md:grid-cols-2">
                <p><span className="text-slate-500">Target:</span> {a.target || "—"}</p>
                <p><span className="text-slate-500">Planned action:</span> {a.plannedAction || "—"}</p>
                <p><span className="text-slate-500">Potential impact:</span> {a.potentialImpact || "—"}</p>
                <p><span className="text-slate-500">Policy rule:</span> {a.policyRule || "—"}</p>
                <p className="md:col-span-2"><span className="text-slate-500">Why approval is required:</span> {a.reason}</p>
              </div>
              <ApprovalControls id={a.id} />
            </div>
          ))}
        </div>
      )}

      {decided.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Decided ({decided.length})
          </h2>
          <div className="card overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Target</th>
                  <th>Decision</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {decided.map((a) => (
                  <tr key={a.id}>
                    <td className="text-slate-200">{a.potentialFinding || a.plannedAction || a.subjectType}</td>
                    <td className="text-slate-400">{a.target}</td>
                    <td>
                      <Tag tone={a.status === "APPROVED" ? "green" : a.status === "REJECTED" ? "red" : "amber"}>{a.status}</Tag>
                    </td>
                    <td className="text-slate-400">{a.decisionNote || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
