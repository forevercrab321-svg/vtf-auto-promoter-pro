import { PageHeader, Tag } from "@/components/ui";
import { ALWAYS_PROHIBITED, CORE_PRINCIPLES } from "@/lib/types";
import { getProvider, llmConfigured } from "@/lib/llm";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const provider = getProvider();
  const configured = llmConfigured();
  const activeTesting = (process.env.ENABLE_ACTIVE_TESTING || "false").toLowerCase() === "true";

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Read-only view of the runtime configuration. Change values in your .env file, then restart the app."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="card-title mb-3">Runtime</h2>
          <ConfigRow label="LLM provider" value={provider} />
          <ConfigRow label="LLM configured" value={configured ? "yes" : "no (deterministic fallback)"} />
          <ConfigRow label="Active testing enabled" value={activeTesting ? "true" : "false (planning-only)"} />
          <ConfigRow label="Database" value={(process.env.DATABASE_URL || "").startsWith("file:") ? "SQLite (local)" : "external"} />
          <p className="mt-3 text-xs text-slate-500">
            The system is fully functional with no LLM key. Providing one only improves report/hypothesis wording.
            It never changes the deterministic Scope Guardian or Supervisor decisions.
          </p>
        </section>

        <section className="card">
          <h2 className="card-title mb-3">Immutable core principles</h2>
          <div className="flex flex-wrap gap-2">
            {CORE_PRINCIPLES.map((p) => (
              <Tag key={p} tone="indigo">
                {p}
              </Tag>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">No agent can override these. They are enforced in code, not policy text.</p>
        </section>

        <section className="card lg:col-span-2">
          <h2 className="card-title mb-3">Always-prohibited techniques (hard block)</h2>
          <div className="flex flex-wrap gap-2">
            {ALWAYS_PROHIBITED.map((p) => (
              <Tag key={p} tone="red">
                {p}
              </Tag>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Any planned test matching these is blocked by the Scope Guardian and Supervisor regardless of program policy.
          </p>
        </section>
      </div>
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-800 py-2 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono text-slate-200">{value}</span>
    </div>
  );
}
