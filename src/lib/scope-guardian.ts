// ============================================================================
// SCOPE GUARDIAN  —  the most important agent in the system.
//
// It is a DETERMINISTIC rule engine, never an LLM guess. Every test must pass
// through it first. It answers three questions with certainty:
//   1. Is this target IN_SCOPE, OUT_OF_SCOPE, or SCOPE_UNKNOWN?
//   2. Is the planned test technique allowed (never a prohibited one)?
//   3. Can we issue a valid Authorization Token?
//
// Rule of the house:  if scope cannot be proven, it is NOT in scope.
// ============================================================================

import { ALWAYS_PROHIBITED } from "./types";
import type { ScopeStatus, SafetyState } from "./types";

export interface ScopeRuleInput {
  kind: "ALLOW" | "BLOCK";
  ruleType:
    | "DOMAIN"
    | "SUBDOMAIN"
    | "WILDCARD"
    | "APP"
    | "API_HOST"
    | "METHOD"
    | "ASSET"
    | "TEST_ACCOUNT";
  pattern: string;
}

export interface ScopeDecision {
  status: ScopeStatus;
  safetyState: SafetyState;
  reason: string;
  matchedRule?: ScopeRuleInput;
  prohibited?: string; // set when a prohibited technique was detected
}

/** Extract a bare host from a URL / host / arbitrary target string. */
export function normalizeHost(target: string): string {
  let t = (target || "").trim().toLowerCase();
  if (!t) return "";
  // strip scheme
  t = t.replace(/^[a-z]+:\/\//, "");
  // strip credentials
  t = t.replace(/^[^@/]+@/, "");
  // strip path, query, port
  t = t.split("/")[0].split("?")[0].split("#")[0].split(":")[0];
  return t.trim();
}

/** Does a host match a rule pattern? Wildcards match subdomains only (strict). */
export function hostMatchesPattern(host: string, pattern: string, ruleType: string): boolean {
  const h = normalizeHost(host);
  const p = pattern.trim().toLowerCase();
  if (!h || !p) return false;

  if (ruleType === "WILDCARD" || p.startsWith("*.")) {
    const base = p.replace(/^\*\./, "");
    // strict: *.example.com matches a.example.com, not example.com itself
    return h.endsWith("." + base);
  }
  if (ruleType === "SUBDOMAIN") {
    return h === p || h.endsWith("." + p);
  }
  // DOMAIN / API_HOST / APP / ASSET → treat as exact host (or normalized token)
  const pHost = normalizeHost(p);
  return h === pHost;
}

/** Is a planned test technique in the always-prohibited list? */
export function detectProhibitedTechnique(planned: string): string | null {
  const s = (planned || "").toLowerCase();
  for (const bad of ALWAYS_PROHIBITED) {
    if (s.includes(bad.toLowerCase())) return bad;
  }
  return null;
}

/**
 * The core scope check. Blocklist always wins over allowlist.
 * plannedTestType is checked against both prohibited techniques and BLOCK METHOD rules.
 */
export function checkScope(params: {
  target: string;
  plannedTestType?: string;
  rules: ScopeRuleInput[];
  programProhibited?: string[]; // extra techniques the program prohibits
}): ScopeDecision {
  const { target, plannedTestType = "", rules, programProhibited = [] } = params;
  const host = normalizeHost(target);

  if (!host) {
    return {
      status: "SCOPE_UNKNOWN",
      safetyState: "YELLOW",
      reason: "Target could not be parsed to a host. Scope cannot be proven — treated as unknown.",
    };
  }

  // 1. Always-prohibited techniques → hard RED regardless of asset scope.
  const prohibited = detectProhibitedTechnique(plannedTestType);
  if (prohibited) {
    return {
      status: "OUT_OF_SCOPE",
      safetyState: "RED",
      reason: `Planned technique matches an always-prohibited category ("${prohibited}"). No agent can authorize this.`,
      prohibited,
    };
  }
  // program-specific prohibited techniques
  for (const pp of programProhibited) {
    if (pp && plannedTestType.toLowerCase().includes(pp.toLowerCase())) {
      return {
        status: "OUT_OF_SCOPE",
        safetyState: "RED",
        reason: `Planned technique is prohibited by this program's policy ("${pp}").`,
        prohibited: pp,
      };
    }
  }

  // 2. BLOCK rules win. Any block match → OUT_OF_SCOPE / RED.
  for (const r of rules.filter((r) => r.kind === "BLOCK")) {
    if (r.ruleType === "METHOD") {
      if (plannedTestType && plannedTestType.toLowerCase().includes(r.pattern.toLowerCase())) {
        return {
          status: "OUT_OF_SCOPE",
          safetyState: "RED",
          reason: `Test method "${r.pattern}" is explicitly blocked by program policy.`,
          matchedRule: r,
          prohibited: r.pattern,
        };
      }
      continue;
    }
    if (hostMatchesPattern(host, r.pattern, r.ruleType)) {
      return {
        status: "OUT_OF_SCOPE",
        safetyState: "RED",
        reason: `Target matches a BLOCK rule (${r.ruleType}: ${r.pattern}). Out of scope.`,
        matchedRule: r,
      };
    }
  }

  // 3. ALLOW rules. A host match → IN_SCOPE / GREEN.
  for (const r of rules.filter((r) => r.kind === "ALLOW")) {
    if (["METHOD", "TEST_ACCOUNT"].includes(r.ruleType)) continue;
    if (hostMatchesPattern(host, r.pattern, r.ruleType)) {
      return {
        status: "IN_SCOPE",
        safetyState: "GREEN",
        reason: `Target matches an ALLOW rule (${r.ruleType}: ${r.pattern}) and no block rules apply.`,
        matchedRule: r,
      };
    }
  }

  // 4. No decisive rule → SCOPE_UNKNOWN. NEVER guess in scope.
  return {
    status: "SCOPE_UNKNOWN",
    safetyState: "YELLOW",
    reason:
      "No ALLOW or BLOCK rule matched this target. Scope cannot be confirmed — testing must stop until a human verifies scope.",
  };
}

// ---------------------------------------------------------------------------
// POLICY PARSER  — heuristic extraction of candidate scope rules from a
// natural-language program policy. Output is a *proposal* a human confirms;
// it deliberately errs toward BLOCK / uncertainty rather than granting scope.
// ---------------------------------------------------------------------------
export function parsePolicyToRules(policyText: string): {
  proposed: ScopeRuleInput[];
  warnings: string[];
} {
  const proposed: ScopeRuleInput[] = [];
  const warnings: string[] = [];
  const text = policyText || "";

  if (!text.trim()) {
    return { proposed, warnings: ["Empty policy — nothing to parse. Add scope manually."] };
  }

  const lines = text.split(/\r?\n/);
  // Match domains and wildcards like *.example.com, api.example.com, example.co.uk
  const domainRe = /(\*\.)?([a-z0-9-]+\.)+[a-z]{2,}/gi;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const lower = line.toLowerCase();

    // Decide the intended kind for this line.
    const looksBlocked =
      /(out[- ]?of[- ]?scope|not in scope|excluded|do not test|prohibited|forbidden|blocked|ineligible)/.test(
        lower,
      );
    const looksAllowed = /(in[- ]?scope|eligible|you may test|targets?:|assets?:|domains?:)/.test(lower);

    // Prohibited technique mentions → BLOCK METHOD rules.
    for (const bad of ALWAYS_PROHIBITED) {
      if (lower.includes(bad.toLowerCase())) {
        if (!proposed.some((r) => r.ruleType === "METHOD" && r.pattern === bad)) {
          proposed.push({ kind: "BLOCK", ruleType: "METHOD", pattern: bad });
        }
      }
    }

    const domains = line.match(domainRe);
    if (domains) {
      for (const d of domains) {
        const pattern = d.toLowerCase();
        const ruleType = pattern.startsWith("*.") ? "WILDCARD" : "DOMAIN";
        const kind = looksBlocked ? "BLOCK" : "ALLOW";
        if (looksBlocked || looksAllowed || ruleType === "WILDCARD") {
          if (!proposed.some((r) => r.pattern === pattern && r.kind === kind)) {
            proposed.push({ kind, ruleType, pattern });
          }
        } else {
          // Ambiguous context → do not auto-allow. Flag it.
          warnings.push(
            `Found "${pattern}" but the surrounding text did not clearly say in-scope or out-of-scope. Confirm manually.`,
          );
        }
      }
    }
  }

  if (proposed.filter((r) => r.kind === "ALLOW").length === 0) {
    warnings.push(
      "No ALLOW rules could be confidently extracted. Add in-scope assets manually before any testing.",
    );
  }

  return { proposed, warnings };
}

/** Compute an expiry timestamp for an authorization token (default 7 days). */
export function tokenExpiry(days = 7): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
