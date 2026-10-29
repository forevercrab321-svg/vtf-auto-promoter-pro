// ============================================================================
// DUPLICATE RISK — pre-submission duplicate pre-check.
//
// Duplicates are the biggest time sink in bug bounty. This helper structures
// the check: it matches against the internal knowledge base and BUILDS the
// external search queries for the researcher to run (publicly disclosed
// reports, search engines). It deliberately does NOT auto-scrape platforms —
// that would risk ToS/scope violations. The human runs the queries and records
// the outcome.
// ============================================================================

export interface DuplicateCheckInput {
  title: string;
  vulnType: string;
  target?: string | null;
  programName?: string | null;
  /** Internal knowledge-base entries to match against (title + body + tags). */
  internalCorpus?: { title: string; body: string; tags: string[]; category: string }[];
}

export interface DuplicateQuery {
  label: string;
  url: string;
}

export interface DuplicateCheckResult {
  risk: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  internalMatches: { title: string; category: string; why: string }[];
  /** Searches the researcher should run manually before submitting. */
  queries: DuplicateQuery[];
  rationale: string;
}

function keywords(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9/\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);
}

export function duplicatePreCheck(input: DuplicateCheckInput): DuplicateCheckResult {
  const terms = new Set([...keywords(input.title), ...keywords(input.vulnType)]);

  // --- Internal KB match --------------------------------------------------
  const internalMatches: { title: string; category: string; why: string }[] = [];
  for (const entry of input.internalCorpus ?? []) {
    const hay = `${entry.title} ${entry.body} ${(entry.tags || []).join(" ")}`.toLowerCase();
    const hits = [...terms].filter((t) => hay.includes(t));
    if (hits.length >= 2) {
      internalMatches.push({
        title: entry.title,
        category: entry.category,
        why: `overlaps on: ${hits.slice(0, 5).join(", ")}`,
      });
    }
  }

  // --- External search queries (manual, no auto-scrape) -------------------
  const q = encodeURIComponent(`${input.vulnType} ${input.target ?? ""}`.trim());
  const qTitle = encodeURIComponent(input.title);
  const queries: DuplicateQuery[] = [
    {
      label: "HackerOne Hacktivity (disclosed reports)",
      url: `https://hackerone.com/hacktivity?querystring=${q}`,
    },
    {
      label: "Google — disclosed reports & writeups",
      url: `https://www.google.com/search?q=${qTitle}+${encodeURIComponent("bug bounty report")}`,
    },
    {
      label: "GitHub Advisory Database",
      url: `https://github.com/advisories?query=${q}`,
    },
  ];
  if (input.programName) {
    queries.push({
      label: "Program policy — known-issues / out-of-scope section",
      url: `https://www.google.com/search?q=${encodeURIComponent(input.programName)}+${encodeURIComponent(
        "known issues OR out of scope",
      )}`,
    });
  }

  // --- Heuristic risk -----------------------------------------------------
  // Common, high-duplicate classes start MEDIUM; internal overlap raises it.
  const highDupType = /(xss|open redirect|clickjacking|csrf|idor|information disclosure|missing header)/i.test(
    input.vulnType,
  );
  let risk: DuplicateCheckResult["risk"] = highDupType ? "MEDIUM" : "UNKNOWN";
  if (internalMatches.length > 0) risk = "HIGH";

  const rationale =
    internalMatches.length > 0
      ? "Internal knowledge base shows overlapping prior work — review those entries, then run the external searches before submitting."
      : highDupType
        ? "This class duplicates frequently. Run the external searches; a unique root cause, asset, or larger impact can still make it worth reporting."
        : "No internal overlap found. Run the external searches to confirm novelty before submitting.";

  return { risk, internalMatches, queries, rationale };
}
