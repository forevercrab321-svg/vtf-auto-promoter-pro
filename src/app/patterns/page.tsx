import { PATTERNS, taxonomy, remediationFor, citationUrl, citationLabel, SOURCES } from "@/lib/knowledge";
import type { PatternFamily } from "@/lib/knowledge";
import { PageHeader, Tag } from "@/components/ui";

export const dynamic = "force-dynamic";

const FAMILY_LABEL: Record<PatternFamily, string> = {
  Authorization: "Authorization",
  Authentication: "Authentication",
  BusinessLogic: "Business Logic",
  ServerSide: "Server Side",
};

function bandTone(b: string) {
  return b === "CRITICAL" || b === "HIGH" ? "red" : b === "MEDIUM" ? "amber" : "slate";
}

export default function PatternsPage() {
  const tree = taxonomy();
  const families = Object.keys(tree) as PatternFamily[];

  return (
    <div>
      <PageHeader
        title="Vulnerability Pattern Library"
        subtitle="The Security Knowledge Base — reasoning chains, not definitions. Each pattern: when to suspect → what signal → minimum-impact test → evidence → false positives → impact. Sourced from public authorities (OWASP, MITRE CWE, PortSwigger) and disclosed reports."
      />

      {/* Taxonomy overview */}
      <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {families.map((f) => (
          <div key={f} className="card">
            <a href={`#${f}`} className="card-title hover:text-indigo-300">
              {FAMILY_LABEL[f]} · {tree[f].length}
            </a>
            <div className="mt-2 flex flex-wrap gap-1">
              {tree[f].map((sub) => (
                <span key={sub} className="pill bg-ink-800 text-slate-400">
                  {sub}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Sources */}
      <div className="mb-8 card">
        <h2 className="card-title mb-2">Authoritative sources</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.values(SOURCES).map((s) => (
            <a
              key={s.key}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="pill bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-500/30 hover:bg-indigo-500/20"
            >
              {s.name}
            </a>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          All public and freely licensed — nothing here is derived from copyrighted books. Reference IDs verified 2026-09-19.
        </p>
      </div>

      {/* Patterns grouped by family */}
      {families.map((f) => (
        <section key={f} id={f} className="mb-8 scroll-mt-6">
          <h2 className="mb-3 text-lg font-bold text-white">{FAMILY_LABEL[f]}</h2>
          <div className="space-y-3">
            {PATTERNS.filter((p) => p.family === f).map((p) => (
              <details key={p.id} className="card">
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-100">{p.title}</span>
                  <span className="flex flex-wrap gap-1">
                    <Tag tone="indigo">{p.subfamily}</Tag>
                    <Tag tone={bandTone(p.severityBand)}>{p.severityBand}</Tag>
                    <Tag tone={p.duplicateDensity === "HIGH" ? "red" : p.duplicateDensity === "MEDIUM" ? "amber" : "green"}>
                      dup: {p.duplicateDensity}
                    </Tag>
                    {p.requiresHumanApproval && <Tag tone="amber">human approval</Tag>}
                  </span>
                </summary>

                <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
                  <Field label="Pattern" v={p.vulnerabilityPattern} />
                  <Field label="Application context" v={p.applicationContext} />
                  <Field label="Precondition" v={p.precondition} />
                  <Field label="Observation (why suspect)" v={p.observation} highlight />
                  <Field label="Research hypothesis" v={p.researchHypothesis} highlight />
                  <Field label="Security boundary" v={p.securityBoundary} />
                  <Field label="Minimum-impact test" v={p.test} highlight />
                  <Field label="Unexpected behavior" v={p.unexpectedBehavior} />
                  <Field label="Root cause" v={p.rootCause} />
                  <Field label="Exploit condition" v={p.exploitCondition} />
                  <Field label="Impact" v={p.impact} />
                  <Field label="Detection heuristic" v={p.detectionHeuristic} />
                </dl>

                <div className="mt-3 border-t border-ink-800 pt-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">False-positive conditions</p>
                  <ul className="mb-3 space-y-0.5 text-xs text-slate-400">
                    {p.falsePositiveConditions.map((fp, i) => (
                      <li key={i}>• {fp}</li>
                    ))}
                  </ul>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Remediation</p>
                  <p className="mb-3 text-xs text-slate-300">{remediationFor(p.id)}</p>
                  <div className="flex flex-wrap gap-2">
                    {p.citations.map((c, i) => (
                      <a
                        key={i}
                        href={citationUrl(c.source, c.ref, c.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="pill bg-ink-800 text-slate-300 hover:text-indigo-300"
                      >
                        {citationLabel(c.source, c.ref)}
                      </a>
                    ))}
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Field({ label, v, highlight }: { label: string; v: string; highlight?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-0.5 whitespace-pre-line text-sm ${highlight ? "text-slate-200" : "text-slate-400"}`}>{v}</dd>
    </div>
  );
}
