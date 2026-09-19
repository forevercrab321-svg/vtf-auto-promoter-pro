// ============================================================================
// SECURITY KNOWLEDGE BASE — pattern schema.
//
// A pattern is NOT a vulnerability definition. A definition tells you what IDOR
// is; a pattern tells you the reasoning chain a researcher actually runs:
//
//   when to suspect → what signal to look for → how to design a minimum-impact
//   test → what counts as evidence → what would make it a false positive →
//   how to judge real impact
//
// Every pattern is sourced from public, citable, freely-licensed authorities
// (OWASP WSTG / API Top 10 / ASVS, MITRE CWE, PortSwigger Web Security Academy)
// plus publicly disclosed bug bounty reports. See ./sources.ts.
//
// SAFETY: `test` always describes the MINIMUM-IMPACT way to establish whether
// the boundary holds, using researcher-owned accounts and data. Patterns carry
// `requiresHumanApproval` when even a careful test could touch other users,
// change state, or affect availability. These fields feed the Supervisor gate —
// they never bypass it.
// ============================================================================

export type PatternFamily = "Authorization" | "Authentication" | "BusinessLogic" | "ServerSide";

export type SeverityBand = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/** Typical duplicate density in public programs — steers where to spend time. */
export type DuplicateDensity = "LOW" | "MEDIUM" | "HIGH";

export interface Citation {
  /** Key into SOURCES (see ./sources.ts). */
  source: string;
  /** Specific identifier within that source, e.g. "API1:2023", "CWE-639", "WSTG-ATHZ-04". */
  ref?: string;
  /** Direct URL when the source registry cannot derive one. */
  url?: string;
}

export interface VulnPattern {
  id: string;
  family: PatternFamily;
  /** Sub-bucket in the taxonomy, e.g. "IDOR", "OAuth", "Race condition". */
  subfamily: string;
  title: string;

  // --- the 13 structured reasoning fields -----------------------------------
  /** The abstract shape of the flaw, independent of any one product. */
  vulnerabilityPattern: string;
  /** The kind of product/feature where this shape shows up. */
  applicationContext: string;
  /** What must be true before the test is even meaningful. */
  precondition: string;
  /** The concrete signal that should make you suspect it. This is the "why did
   *  the researcher think to test here" field — the highest-value one. */
  observation: string;
  /** The falsifiable question, phrased so a single request can answer it. */
  researchHypothesis: string;
  /** The boundary that is supposed to hold. */
  securityBoundary: string;
  /** Minimum-impact test design. Self-owned accounts, reversible, single-shot. */
  test: string;
  /** What a vulnerable system does that a secure one does not. */
  unexpectedBehavior: string;
  /** The underlying engineering mistake. */
  rootCause: string;
  /** What an attacker additionally needs for this to matter. */
  exploitCondition: string;
  /** Honest, non-exaggerated impact. */
  impact: string;
  /** The specific things that look like this bug but are not. Prevents the
   *  single biggest source of rejected reports. */
  falsePositiveConditions: string[];
  /** A short rule of thumb for spotting candidates at scale. */
  detectionHeuristic: string;

  // --- operational metadata -------------------------------------------------
  severityBand: SeverityBand;
  duplicateDensity: DuplicateDensity;
  /** Attack-surface categories (see lib/types.ts ATTACK_SURFACE_CATEGORIES)
   *  this pattern applies to — used to suggest patterns per target. */
  surfaceCategories: string[];
  /** True when even a minimum-impact test needs a human decision first. */
  requiresHumanApproval: boolean;
  citations: Citation[];
}

/** Report-ready remediation direction, kept separate so reports stay factual. */
export interface PatternRemediation {
  patternId: string;
  remediation: string;
}
