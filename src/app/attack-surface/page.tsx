import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, Tag, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AttackSurfacePage() {
  const items = await prisma.attackSurfaceItem.findMany({
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    include: { target: { select: { id: true, name: true, safetyState: true } } },
  });

  const byCategory = new Map<string, number>();
  for (const i of items) byCategory.set(i.category, (byCategory.get(i.category) ?? 0) + 1);
  const topCategories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <PageHeader
        title="Attack Surface"
        subtitle="Categorized surface across all targets. High-priority = high-value, lower-duplicate research (authorization, IDOR/BOLA, multi-tenant, business logic)."
      />

      {items.length === 0 ? (
        <EmptyState title="No attack surface mapped yet." hint="Open an in-scope target and run analysis." />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            {topCategories.map(([c, n]) => (
              <span key={c} className="pill bg-ink-800 text-slate-300">
                {c} · {n}
              </span>
            ))}
          </div>
          <div className="card overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Component</th>
                  <th>Priority</th>
                  <th>Target</th>
                  <th>Rationale</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <td className="font-medium text-slate-200">{i.category}</td>
                    <td className="text-slate-300">{i.component}</td>
                    <td>
                      <Tag tone={i.priority === "HIGH" ? "red" : i.priority === "MEDIUM" ? "amber" : "slate"}>{i.priority}</Tag>
                    </td>
                    <td>
                      <Link href={`/targets/${i.target.id}`} className="text-indigo-300 hover:underline">
                        {i.target.name}
                      </Link>
                    </td>
                    <td className="text-xs text-slate-500">{i.rationale}</td>
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
