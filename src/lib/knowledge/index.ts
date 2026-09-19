// ============================================================================
// SECURITY KNOWLEDGE BASE — aggregation + query API.
//
//   SECURITY KNOWLEDGE BASE
//   ├── Authorization  (IDOR · BOLA · BFLA · Multi-tenant · Priv-esc · Role confusion)
//   ├── Authentication (Session · Password reset · OAuth · Token lifecycle · ATO)
//   ├── Business Logic (State · Workflow bypass · Race · Pricing · Coupon · Invitation)
//   └── Server Side    (SSRF · XXE · SSTI · File handling · SQLi)
//
// Each pattern is a reasoning chain, not a definition — see ./types.ts.
// ============================================================================

import type { VulnPattern, PatternRemediation, PatternFamily } from "./types";
import { AUTHORIZATION_PATTERNS, AUTHORIZATION_REMEDIATIONS } from "./patterns.authorization";
import { AUTHENTICATION_PATTERNS, AUTHENTICATION_REMEDIATIONS } from "./patterns.authentication";
import { BUSINESS_LOGIC_PATTERNS, BUSINESS_LOGIC_REMEDIATIONS } from "./patterns.business-logic";
import { SERVER_SIDE_PATTERNS, SERVER_SIDE_REMEDIATIONS } from "./patterns.server-side";

export * from "./types";
export { SOURCES, citationUrl, citationLabel } from "./sources";

export const PATTERNS: VulnPattern[] = [
  ...AUTHORIZATION_PATTERNS,
  ...AUTHENTICATION_PATTERNS,
  ...BUSINESS_LOGIC_PATTERNS,
  ...SERVER_SIDE_PATTERNS,
];

export const REMEDIATIONS: PatternRemediation[] = [
  ...AUTHORIZATION_REMEDIATIONS,
  ...AUTHENTICATION_REMEDIATIONS,
  ...BUSINESS_LOGIC_REMEDIATIONS,
  ...SERVER_SIDE_REMEDIATIONS,
];

/** The taxonomy tree, derived from the patterns (single source of truth). */
export function taxonomy(): Record<PatternFamily, string[]> {
  const tree = {
    Authorization: [],
    Authentication: [],
    BusinessLogic: [],
    ServerSide: [],
  } as Record<PatternFamily, string[]>;
  for (const p of PATTERNS) {
    if (!tree[p.family].includes(p.subfamily)) tree[p.family].push(p.subfamily);
  }
  return tree;
}

export function getPattern(id: string): VulnPattern | undefined {
  return PATTERNS.find((p) => p.id === id);
}

export function remediationFor(patternId: string): string {
  return REMEDIATIONS.find((r) => r.patternId === patternId)?.remediation ?? "";
}

export function patternsByFamily(family: PatternFamily): VulnPattern[] {
  return PATTERNS.filter((p) => p.family === family);
}

/** Patterns relevant to a set of attack-surface categories, ranked by overlap. */
export function patternsForSurfaces(surfaceCategories: string[]): VulnPattern[] {
  const set = new Set(surfaceCategories);
  return PATTERNS.map((p) => ({
    p,
    score: p.surfaceCategories.filter((c) => set.has(c)).length,
  }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);
}

/** Lightweight keyword search across the reasoning fields. */
export function searchPatterns(query: string): VulnPattern[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return PATTERNS.filter((p) =>
    [p.title, p.subfamily, p.vulnerabilityPattern, p.observation, p.detectionHeuristic, p.family]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
}

export const PATTERN_COUNT = PATTERNS.length;
