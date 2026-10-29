// ============================================================================
// FINDING VALIDATION — "proof-required" engine.
//
// This is the capability that separates a high-acceptance research operation
// from a noisy one (and is the actual moat of the leading autonomous systems:
// they submit only VALIDATED findings). It is quality control on findings —
// NOT attack automation. It runs on the researcher's own structured
// observations and never touches a target.
//
// A finding may only reach CONFIRMED when it clears every proof-required
// criterion below. Everything else is LIKELY / UNCERTAIN / FALSE_POSITIVE so it
// cannot enter the report → submit pipeline. Deterministic by design.
// ============================================================================

import type { ValidationState } from "./types";
import { getPattern } from "./knowledge";

export interface ValidationInput {
  /** Distinct, independent reproductions (different account/session/time). */
  independentReproductions: number;
  /** Confirmed tested within authorized scope, using researcher-owned accounts. */
  authorizationContextValid: boolean;
  /** A clear allowed-vs-denied / expected-vs-actual contrast exists (minimum proof). */
  differentialSignal: boolean;
  /** Minimal, redacted evidence was captured. */
  minimumProofEvidence: boolean;
  /** Environmental noise (WAF/cache/rate-limit pages, retries) ruled out. */
  environmentalNoiseRuledOut: boolean;
  /** Concrete, non-exaggerated business impact articulated. */
  businessImpactArticulated: boolean;
  /** The matched knowledge-base pattern (for its false-positive checklist). */
  patternId?: string | null;
  /** Each known false-positive condition and whether it has been cleared.
   *  If omitted, the engine seeds it from the pattern and treats all as unclear. */
  falsePositiveChecklist?: { condition: string; cleared: boolean }[];
}

export interface ValidationResult {
  verdict: ValidationState;
  reproducible: boolean;
  /** Criteria required for CONFIRMED, split by whether they are met. */
  met: string[];
  unmet: string[];
  /** Human-readable next steps to reach CONFIRMED. */
  gaps: string[];
  rationale: string;
  falsePositiveChecklist: { condition: string; cleared: boolean }[];
}

const CONFIRMED_CRITERIA = [
  "authorization context valid",
  ">= 2 independent reproductions",
  "differential signal present",
  "minimum-proof evidence captured",
  "environmental noise ruled out",
  "all false-positive conditions cleared",
] as const;

/** Seed the false-positive checklist from the matched pattern when absent. */
function resolveChecklist(input: ValidationInput): { condition: string; cleared: boolean }[] {
  if (input.falsePositiveChecklist && input.falsePositiveChecklist.length) {
    return input.falsePositiveChecklist;
  }
  const pattern = input.patternId ? getPattern(input.patternId) : undefined;
  const conditions = pattern?.falsePositiveConditions ?? [];
  return conditions.map((condition) => ({ condition, cleared: false }));
}

export function validateFinding(input: ValidationInput): ValidationResult {
  const checklist = resolveChecklist(input);
  const allFpCleared = checklist.length === 0 ? false : checklist.every((c) => c.cleared);
  const anyFpMatches = checklist.some((c) => !c.cleared);

  const checks: Record<(typeof CONFIRMED_CRITERIA)[number], boolean> = {
    "authorization context valid": input.authorizationContextValid,
    ">= 2 independent reproductions": input.independentReproductions >= 2,
    "differential signal present": input.differentialSignal,
    "minimum-proof evidence captured": input.minimumProofEvidence,
    "environmental noise ruled out": input.environmentalNoiseRuledOut,
    "all false-positive conditions cleared": allFpCleared,
  };

  const met = CONFIRMED_CRITERIA.filter((c) => checks[c]);
  const unmet = CONFIRMED_CRITERIA.filter((c) => !checks[c]);

  const gaps: string[] = [];
  if (!checks["authorization context valid"])
    gaps.push("Confirm the test ran inside authorized scope using your own accounts before validating.");
  if (!checks[">= 2 independent reproductions"])
    gaps.push(`Reproduce the behavior independently at least twice (have ${input.independentReproductions}).`);
  if (!checks["differential signal present"])
    gaps.push("Capture a clear allowed-vs-denied / expected-vs-actual contrast (the minimum proof).");
  if (!checks["minimum-proof evidence captured"])
    gaps.push("Attach minimal, redacted evidence (request/response or screenshot).");
  if (!checks["environmental noise ruled out"])
    gaps.push("Rule out WAF/cache/rate-limit pages and retries as the cause.");
  if (!checks["all false-positive conditions cleared"]) {
    const open = checklist.filter((c) => !c.cleared).map((c) => c.condition);
    if (checklist.length === 0)
      gaps.push("No false-positive checklist available — add one (seed it from the matched pattern) and clear each item.");
    else gaps.push(`Clear these false-positive conditions: ${open.join(" | ")}`);
  }

  // --- Verdict ------------------------------------------------------------
  // Without a valid authorization context we cannot validate at all.
  if (!input.authorizationContextValid) {
    return {
      verdict: "UNCERTAIN",
      reproducible: input.independentReproductions >= 1,
      met,
      unmet,
      gaps,
      rationale: "Cannot validate: authorization context is not confirmed. Verify scope and that only your own accounts were used.",
      falsePositiveChecklist: checklist,
    };
  }

  const allMet = unmet.length === 0;
  if (allMet) {
    return {
      verdict: "CONFIRMED",
      reproducible: true,
      met,
      unmet,
      gaps: [],
      rationale: "All proof-required criteria met: independently reproduced, differential signal, minimal evidence, noise excluded, and every false-positive condition cleared.",
      falsePositiveChecklist: checklist,
    };
  }

  // A known false-positive condition that the researcher could NOT clear, with
  // no differential signal, points to FALSE_POSITIVE rather than a real bug.
  if (anyFpMatches && !input.differentialSignal) {
    return {
      verdict: "FALSE_POSITIVE",
      reproducible: input.independentReproductions >= 1,
      met,
      unmet,
      gaps,
      rationale: "An unresolved false-positive condition explains the behavior and there is no differential signal — treat as a false positive until proven otherwise.",
      falsePositiveChecklist: checklist,
    };
  }

  // Strong-but-incomplete evidence → LIKELY; otherwise UNCERTAIN.
  const likely =
    input.differentialSignal &&
    input.independentReproductions >= 1 &&
    input.minimumProofEvidence &&
    unmet.length <= 2;

  return {
    verdict: likely ? "LIKELY" : "UNCERTAIN",
    reproducible: input.independentReproductions >= 1,
    met,
    unmet,
    gaps,
    rationale: likely
      ? "Credible signal but not yet fully proof-required. Close the remaining gaps to reach CONFIRMED."
      : "Insufficient proof. Several criteria are open; gather more before claiming this finding.",
    falsePositiveChecklist: checklist,
  };
}

/** Criteria list, exposed for UIs that render the checklist. */
export { CONFIRMED_CRITERIA };
