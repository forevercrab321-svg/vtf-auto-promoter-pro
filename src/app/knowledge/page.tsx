import { prisma } from "@/lib/db";
import { PageHeader, Tag, EmptyState } from "@/components/ui";
import { AddKnowledgeForm } from "@/components/AddKnowledgeForm";
import { parseJsonArray } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const entries = await prisma.knowledgeEntry.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <PageHeader
        title="Knowledge Base"
        subtitle="Reusable research assets: programs, auth models, finding patterns, false positives, duplicates, and lessons. Query it before every new task to avoid repeat work."
      >
        <AddKnowledgeForm />
      </PageHeader>

      {entries.length === 0 ? (
        <EmptyState title="Knowledge base is empty." hint="Capture patterns, false positives, and lessons as you research." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {entries.map((e) => (
            <div key={e.id} className="card">
              <div className="flex items-center justify-between">
                <Tag tone="indigo">{e.category}</Tag>
                <span className="text-[11px] text-slate-500">{e.createdAt.toISOString().slice(0, 10)}</span>
              </div>
              <h3 className="mt-2 font-semibold text-slate-100">{e.title}</h3>
              {e.body && <p className="mt-1 text-sm text-slate-400">{e.body}</p>}
              <div className="mt-2 flex flex-wrap gap-1">
                {parseJsonArray(e.tags).map((t) => (
                  <span key={t} className="pill bg-ink-800 text-slate-400">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
