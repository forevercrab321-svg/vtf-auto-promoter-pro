// ============================================================================
// VULNERABILITY HYPOTHESIS LIBRARY
// No blind scanning. We generate TESTABLE security hypotheses focused on
// authorization, multi-tenant isolation, and business logic — the high-value,
// lower-duplicate space. Each hypothesis is safe to reason about; execution is
// always gated by Scope Guardian + Supervisor + (usually) human approval.
// ============================================================================

import { patternsForSurfaces } from "./knowledge";

export interface HypothesisTemplate {
  title: string;
  category: string;
  precondition: string;
  expectedSecureBehavior: string;
  testStrategy: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  humanApprovalRequired: boolean;
  potentialImpact: string;
  // which attack-surface categories this template applies to
  appliesTo: string[];
}

export const HYPOTHESIS_TEMPLATES: HypothesisTemplate[] = [
  {
    title: "Object created by User A is readable only by User A (IDOR / BOLA)",
    category: "IDOR / BOLA",
    precondition: "Two self-owned test accounts (A and B); A creates an object with a known ID.",
    expectedSecureBehavior: "B requesting A's object ID returns 403/404, never A's data.",
    testStrategy:
      "With two researcher-owned accounts, request A's object as B by ID. Compare 200 vs 403. Use MINIMUM PROOF — do not download A's full data.",
    riskLevel: "LOW",
    humanApprovalRequired: false,
    potentialImpact: "Cross-user data access if authorization is missing on object reads.",
    appliesTo: ["Authorization", "API", "IDOR / BOLA", "Multi-Tenant"],
  },
  {
    title: "Organizations are fully isolated from one another (multi-tenant boundary)",
    category: "Multi-Tenant Isolation",
    precondition: "Two self-owned organizations; a resource created in Org 1.",
    expectedSecureBehavior: "Org 2 members cannot read, list, or mutate Org 1 resources.",
    testStrategy:
      "From an Org 2 account, attempt to access Org 1 resource IDs. Confirm 403 boundary. Prove with a single denied request, not bulk enumeration.",
    riskLevel: "MEDIUM",
    humanApprovalRequired: false,
    potentialImpact: "Tenant isolation break — high-value, often unique.",
    appliesTo: ["Multi-Tenant", "Organization / Team", "Authorization", "API"],
  },
  {
    title: "A normal Member cannot invoke Owner/Admin-only endpoints (privilege boundary)",
    category: "Privilege Boundary",
    precondition: "A self-owned org with an Owner account and a Member account.",
    expectedSecureBehavior: "Member calls to admin endpoints return 403.",
    testStrategy:
      "Enumerate admin actions from docs/JS. As Member, call each once. Record allowed vs denied. No destructive actions.",
    riskLevel: "MEDIUM",
    humanApprovalRequired: true,
    potentialImpact: "Privilege escalation within an organization.",
    appliesTo: ["Authorization", "User Roles", "Admin Functions", "API"],
  },
  {
    title: "Removed member's session/token is invalidated immediately",
    category: "Session Management",
    precondition: "Self-owned org; Member is added, obtains a token, then removed.",
    expectedSecureBehavior: "After removal, the Member's token can no longer access org resources.",
    testStrategy:
      "Capture Member token (own account), remove the Member, replay one benign authorized request. Expect 401/403.",
    riskLevel: "LOW",
    humanApprovalRequired: false,
    potentialImpact: "Lingering access after off-boarding.",
    appliesTo: ["Session Management", "Authorization", "Organization / Team"],
  },
  {
    title: "Invitation token binds to the intended account/email only",
    category: "Business Logic",
    precondition: "Self-owned accounts; an invitation is generated for one email.",
    expectedSecureBehavior: "The invite cannot be redeemed by a different account/email.",
    testStrategy:
      "Generate an invite to address A, attempt redemption from account B. Expect rejection.",
    riskLevel: "MEDIUM",
    humanApprovalRequired: false,
    potentialImpact: "Account/tenant takeover via invite misbinding.",
    appliesTo: ["Invitations", "Business Logic", "Authorization"],
  },
  {
    title: "API checks OWNERSHIP, not just a valid object ID",
    category: "API Authorization",
    precondition: "Self-owned accounts A and B; both create objects.",
    expectedSecureBehavior: "Endpoint verifies the caller owns the object, not merely that the ID exists.",
    testStrategy:
      "As B, reference A's valid object ID in each API action. Confirm ownership check fires (403).",
    riskLevel: "MEDIUM",
    humanApprovalRequired: false,
    potentialImpact: "Broad IDOR across the API if only ID validity is checked.",
    appliesTo: ["API", "Authorization", "IDOR / BOLA"],
  },
  {
    title: "GraphQL resolvers perform independent authorization",
    category: "GraphQL",
    precondition: "Self-owned accounts; a GraphQL endpoint with nested resolvers.",
    expectedSecureBehavior: "Each resolver authorizes independently; nested fields don't leak.",
    testStrategy:
      "Query own data with nested relations that could reach another user's node by ID. Expect denial on unauthorized nodes.",
    riskLevel: "MEDIUM",
    humanApprovalRequired: false,
    potentialImpact: "Authorization bypass via nested GraphQL fields.",
    appliesTo: ["GraphQL", "API", "Authorization"],
  },
  {
    title: "Premium endpoints deny access after a subscription downgrade",
    category: "Business Logic",
    precondition: "Self-owned account with a downgraded/expired plan.",
    expectedSecureBehavior: "Premium-only endpoints return 402/403 after downgrade.",
    testStrategy:
      "Downgrade own account, call previously-premium endpoints once. Expect denial. No payment abuse.",
    riskLevel: "LOW",
    humanApprovalRequired: false,
    potentialImpact: "Paid-feature bypass / revenue loss.",
    appliesTo: ["Subscription", "Payments", "Business Logic", "Authorization"],
  },
  {
    title: "OAuth callback strictly validates redirect_uri",
    category: "OAuth Misconfiguration",
    precondition: "Self-owned OAuth client / login flow.",
    expectedSecureBehavior: "Only pre-registered redirect_uris are accepted; no open redirect.",
    testStrategy:
      "Attempt login with a modified redirect_uri to a researcher-controlled benign URL. Expect rejection. Do not phish real users.",
    riskLevel: "MEDIUM",
    humanApprovalRequired: true,
    potentialImpact: "Token/code leakage via redirect_uri manipulation.",
    appliesTo: ["OAuth", "SSO", "Authentication"],
  },
  {
    title: "Webhook secret cannot be reused across workspaces",
    category: "API Authorization",
    precondition: "Two self-owned workspaces, each with webhook configuration.",
    expectedSecureBehavior: "A workspace's webhook secret is scoped to that workspace only.",
    testStrategy:
      "Attempt to use Workspace 1's secret against Workspace 2's endpoint. Expect rejection.",
    riskLevel: "LOW",
    humanApprovalRequired: false,
    potentialImpact: "Cross-workspace forgery of webhook events.",
    appliesTo: ["Webhooks", "Multi-Tenant", "API"],
  },
  {
    title: "AI agent/tool cannot access data beyond the current user's permissions",
    category: "AI Agent Permission Boundary",
    precondition: "Self-owned account using the product's AI/LLM feature.",
    expectedSecureBehavior:
      "The AI feature is constrained to the requesting user's authorization; no cross-tenant data via prompts/tools.",
    testStrategy:
      "As a low-privilege self-owned account, ask the AI feature for data the account shouldn't access. Expect refusal/empty. Use own data only.",
    riskLevel: "MEDIUM",
    humanApprovalRequired: true,
    potentialImpact: "Authorization bypass through the AI/tool layer.",
    appliesTo: ["AI Features", "LLM Integration", "Prompt / Tool Permissions", "Authorization"],
  },
];

/** Suggest hypotheses relevant to a set of attack-surface categories. */
export function suggestHypotheses(surfaceCategories: string[]): HypothesisTemplate[] {
  const set = new Set(surfaceCategories);
  const matches = HYPOTHESIS_TEMPLATES.filter((t) =>
    t.appliesTo.some((c) => set.has(c)),
  );
  // Always include the two workhorse authorization hypotheses.
  const workhorses = HYPOTHESIS_TEMPLATES.slice(0, 2);
  const merged = [...new Set([...workhorses, ...matches])];
  return merged;
}

// ---------------------------------------------------------------------------
// KNOWLEDGE-BASE-DERIVED HYPOTHESES
// The preferred path: turn Vulnerability Patterns (the distilled reasoning
// chains in src/lib/knowledge) into concrete, testable hypotheses for a target.
// Each carries the pattern id, so a resulting finding/report can cite its
// authoritative sources and remediation.
// ---------------------------------------------------------------------------
export interface DerivedHypothesis {
  patternId: string;
  title: string;
  category: string;
  precondition: string;
  expectedSecureBehavior: string;
  testStrategy: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  humanApprovalRequired: boolean;
  potentialImpact: string;
}

export function hypothesesFromPatterns(surfaceCategories: string[]): DerivedHypothesis[] {
  const patterns = patternsForSurfaces(surfaceCategories);
  // If nothing matched (bare target), fall back to the two authorization workhorses.
  const chosen = patterns.length
    ? patterns
    : patternsForSurfaces(["Authorization", "IDOR / BOLA"]);
  return chosen.map((p) => ({
    patternId: p.id,
    title: p.researchHypothesis,
    category: p.subfamily,
    precondition: p.precondition,
    expectedSecureBehavior: p.securityBoundary,
    testStrategy: `${p.test}\n\nSignal to look for: ${p.observation}\nHeuristic: ${p.detectionHeuristic}`,
    riskLevel: p.severityBand === "CRITICAL" || p.severityBand === "HIGH" ? "HIGH" : p.severityBand === "MEDIUM" ? "MEDIUM" : "LOW",
    humanApprovalRequired: p.requiresHumanApproval,
    potentialImpact: p.impact,
  }));
}
