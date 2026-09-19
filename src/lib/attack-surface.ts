// ============================================================================
// ATTACK SURFACE ANALYST helpers.
// Given signals about a target (tech stack, features), propose categorized
// surface items and prioritise the high-value / lower-duplicate ones.
// ============================================================================

import { PRIORITY_CATEGORIES } from "./types";

const HIGH_VALUE = new Set<string>([
  "Authorization",
  "IDOR / BOLA",
  "Multi-Tenant",
  "Organization / Team",
  "Business Logic",
  "API",
  "GraphQL",
  "OAuth",
  "SSO",
  "AI Features",
  "LLM Integration",
  "Prompt / Tool Permissions",
  "Admin Functions",
  "User Roles",
]);

export interface SurfaceSuggestion {
  category: string;
  component: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  rationale: string;
}

/** Rank a category for a target based on high-value heuristics. */
export function categoryPriority(category: string): "HIGH" | "MEDIUM" | "LOW" {
  if (HIGH_VALUE.has(category)) return "HIGH";
  if (["Session Management", "Account Recovery", "Webhooks", "File Upload", "Payments"].includes(category))
    return "MEDIUM";
  return "LOW";
}

/**
 * Deterministic baseline surface for any authenticated multi-user product.
 * These are the categories worth mapping first; the researcher refines them.
 */
export function baselineSurface(opts: {
  hasApi: boolean;
  hasGraphql?: boolean;
  hasOrgs?: boolean;
  hasAi?: boolean;
  hasPayments?: boolean;
}): SurfaceSuggestion[] {
  const out: SurfaceSuggestion[] = [
    {
      category: "Authorization",
      component: "Object read/update/delete endpoints",
      priority: "HIGH",
      rationale: "Authorization / IDOR is the highest-value, lowest-duplicate space.",
    },
    {
      category: "Authentication",
      component: "Login, MFA, password reset",
      priority: "MEDIUM",
      rationale: "Auth flows are well-trodden but occasionally yield logic bugs.",
    },
    {
      category: "Session Management",
      component: "Token issuance / revocation",
      priority: "MEDIUM",
      rationale: "Revocation gaps after role/membership changes.",
    },
  ];
  if (opts.hasApi)
    out.push({
      category: "API",
      component: "REST endpoints",
      priority: "HIGH",
      rationale: "API authorization frequently checks ID existence, not ownership.",
    });
  if (opts.hasGraphql)
    out.push({
      category: "GraphQL",
      component: "Nested resolvers",
      priority: "HIGH",
      rationale: "Resolver-level authorization is easy to miss.",
    });
  if (opts.hasOrgs) {
    out.push({
      category: "Multi-Tenant",
      component: "Cross-organization isolation",
      priority: "HIGH",
      rationale: "Tenant isolation breaks are high-value and often unique.",
    });
    out.push({
      category: "User Roles",
      component: "Member vs Owner privilege boundary",
      priority: "HIGH",
      rationale: "Privilege escalation within an org.",
    });
  }
  if (opts.hasPayments)
    out.push({
      category: "Business Logic",
      component: "Subscription / plan enforcement",
      priority: "MEDIUM",
      rationale: "Downgrade and coupon logic bypasses.",
    });
  if (opts.hasAi)
    out.push({
      category: "AI Agent Permission Boundary",
      component: "AI feature data access",
      priority: "HIGH",
      rationale: "AI/tool layers may bypass the app's own authorization.",
    });
  return out;
}

export function isPriorityCategory(category: string): boolean {
  return (PRIORITY_CATEGORIES as readonly string[]).includes(category);
}
