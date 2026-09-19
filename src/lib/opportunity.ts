// ============================================================================
// PROGRAM INTELLIGENCE  — score programs by EXPECTED RESEARCH VALUE, not by
// max bounty. We reward big attack surface, business-logic complexity, and API
// exposure; we penalise heavy competition and likely duplicates.
// ============================================================================

export interface OpportunityInput {
  minBounty?: number | null;
  maxBounty?: number | null;
  bountyAvailable: boolean;
  wildcardScope: boolean;
  scopeSize: number;
  apiAvailable: boolean;
  mobileAvailable: boolean;
  sourceCodeAvailable: boolean;
  publicProgram: boolean; // public programs = more competition
  safeHarbor: boolean;
  automatedTestingAllowed: boolean;
  // Optional qualitative signals (0..1)
  businessLogicComplexity?: number; // higher = more logic surface
  authComplexity?: number;
  researchCompetition?: number; // higher = more researchers
  duplicateLikelihood?: number; // higher = more likely dupes
}

export interface OpportunityResult {
  score: number; // 0..100
  priority: "A" | "B" | "C";
  factors: Record<string, number>;
  rationale: string[];
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Expected Research Value model.
 * Positive drivers: reward, attack surface, business logic, API, source access.
 * Negative drivers: competition, duplicate likelihood.
 */
export function scoreProgram(input: OpportunityInput): OpportunityResult {
  const rationale: string[] = [];

  // --- Reward signal (log-ish, capped) -------------------------------------
  const maxB = input.maxBounty ?? 0;
  let reward = clamp01(Math.log10(Math.max(1, maxB)) / 4.5); // ~$30k+ → ~1.0
  if (!input.bountyAvailable) {
    reward *= 0.3;
    rationale.push("No cash bounty (VDP-like) — reward weight reduced.");
  }

  // --- Attack surface breadth ---------------------------------------------
  let surface = clamp01(input.scopeSize / 40);
  if (input.wildcardScope) {
    surface = clamp01(surface + 0.35);
    rationale.push("Wildcard scope broadens attack surface.");
  }

  // --- Access / research depth --------------------------------------------
  let access = 0;
  if (input.apiAvailable) access += 0.4;
  if (input.mobileAvailable) access += 0.2;
  if (input.sourceCodeAvailable) {
    access += 0.4;
    rationale.push("Source code available — deep, lower-duplicate research possible.");
  }
  access = clamp01(access);

  // --- Business-logic / auth complexity (qualitative, defaults inferred) ---
  const bizLogic = clamp01(
    input.businessLogicComplexity ?? (input.apiAvailable ? 0.6 : 0.4),
  );
  const authCplx = clamp01(input.authComplexity ?? (input.apiAvailable ? 0.55 : 0.35));

  // --- Competition & duplicate penalties ----------------------------------
  const competition = clamp01(
    input.researchCompetition ?? (input.publicProgram ? 0.6 : 0.3),
  );
  const dupe = clamp01(input.duplicateLikelihood ?? (input.publicProgram ? 0.55 : 0.35));
  if (competition > 0.5) rationale.push("Public program — expect meaningful competition.");
  if (input.safeHarbor) rationale.push("Safe harbor present — lower legal risk.");

  // --- Weighted expected value --------------------------------------------
  const factors = {
    reward: reward * 26,
    surface: surface * 16,
    access: access * 16,
    businessLogic: bizLogic * 18,
    authComplexity: authCplx * 12,
    competitionPenalty: -competition * 12,
    duplicatePenalty: -dupe * 16,
  };

  let score = Object.values(factors).reduce((a, b) => a + b, 0);
  // normalize into 0..100 (theoretical max ≈ 88, min can be negative)
  score = Math.round(clamp01((score + 28) / 116) * 100);

  let priority: "A" | "B" | "C" = "C";
  if (score >= 66) priority = "A";
  else if (score >= 40) priority = "B";

  if (priority === "A")
    rationale.unshift("Priority A — high expected research value; research first.");
  else if (priority === "B") rationale.unshift("Priority B — solid opportunity.");
  else rationale.unshift("Priority C — lower expected value; deprioritise.");

  return { score, priority, factors, rationale };
}

// ---------------------------------------------------------------------------
// TARGET PRIORITISATION — a lighter score for individual targets. Rewards
// high-value attack-surface categories and confirmed IN_SCOPE status.
// ---------------------------------------------------------------------------
export function scoreTarget(input: {
  scopeStatus: string;
  highValueSurfaces: number; // count of HIGH priority surface items
  totalSurfaces: number;
  hasApi: boolean;
  knownDuplicateHeavy?: boolean;
}): { score: number; priority: "A" | "B" | "C" } {
  if (input.scopeStatus !== "IN_SCOPE") {
    return { score: 0, priority: "C" };
  }
  let score = 20;
  score += Math.min(40, input.highValueSurfaces * 12);
  score += Math.min(15, input.totalSurfaces * 2);
  if (input.hasApi) score += 15;
  if (input.knownDuplicateHeavy) score -= 20;
  score = Math.max(0, Math.min(100, score));
  const priority = score >= 60 ? "A" : score >= 35 ? "B" : "C";
  return { score, priority };
}
