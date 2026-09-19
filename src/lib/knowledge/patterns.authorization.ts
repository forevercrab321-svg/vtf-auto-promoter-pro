import type { VulnPattern, PatternRemediation } from "./types";

// ============================================================================
// FAMILY: Authorization — the highest-value, lowest-duplicate space.
// IDOR · BOLA · BFLA · Multi-tenant isolation · Privilege escalation · Role confusion
// ============================================================================

export const AUTHORIZATION_PATTERNS: VulnPattern[] = [
  {
    id: "authz-idor",
    family: "Authorization",
    subfamily: "IDOR",
    title: "Insecure Direct Object Reference — object read/write keyed only by ID",
    vulnerabilityPattern:
      "An endpoint accepts an object identifier from the client and returns or mutates that object after checking only that the ID is valid — not that the caller is entitled to it.",
    applicationContext:
      "REST/JSON endpoints of the form /resource/{id} on any multi-user product; document, message, invoice, and profile views.",
    precondition: "Two researcher-owned accounts (A and B). A owns an object with a known ID.",
    observation:
      "The ID is sequential, guessable, or exposed elsewhere (in a list response, URL, or email), and the response body's owner field differs from the caller.",
    researchHypothesis: "Can account B read/modify A's object purely by supplying A's object ID?",
    securityBoundary: "A user may only access objects they own or are explicitly granted.",
    test:
      "As B, issue ONE request for A's object ID. Compare status (200 vs 403/404). Stop at the first byte that proves access — do not download A's full data. Use only self-owned objects.",
    unexpectedBehavior: "B receives 200 with A's data (or the write succeeds) instead of 403/404.",
    rootCause: "Missing object-level authorization check; the handler trusts the ID as proof of entitlement.",
    exploitCondition: "Attacker can obtain or guess other users' object IDs (often trivial).",
    impact:
      "Cross-user data disclosure or tampering scoped to the affected object type; scales with ID guessability.",
    falsePositiveConditions: [
      "The two 'accounts' actually share an org/tenant that legitimately grants access.",
      "The object is intentionally public (e.g. a published page).",
      "A 200 returns a generic/empty body, not the other user's data.",
      "Access was granted by a share/invite the tester forgot they created.",
    ],
    detectionHeuristic:
      "For every {id} parameter, ask: is ownership checked, or only existence? Re-request as a second account.",
    severityBand: "HIGH",
    duplicateDensity: "HIGH",
    surfaceCategories: ["Authorization", "IDOR / BOLA", "API"],
    requiresHumanApproval: false,
    citations: [
      { source: "OWASP_API_2023", ref: "API1:2023" },
      { source: "CWE", ref: "CWE-639" },
      { source: "OWASP_WSTG", ref: "WSTG-ATHZ-04" },
      { source: "PORTSWIGGER", url: "https://portswigger.net/web-security/access-control/idor" },
    ],
  },
  {
    id: "authz-bola",
    family: "Authorization",
    subfamily: "BOLA",
    title: "Broken Object Level Authorization (API-native IDOR)",
    vulnerabilityPattern:
      "An API operation resolves an object by client-supplied ID and performs the action without verifying the authenticated principal's relationship to that object.",
    applicationContext:
      "API-first products, mobile backends, and SPA/GraphQL gateways where object IDs flow freely between client and server.",
    precondition: "Two self-owned API accounts with valid tokens; each has created its own objects.",
    observation:
      "The API returns rich objects by ID and the same token works across many object IDs regardless of ownership.",
    researchHypothesis: "Does the API authorize by ownership, or merely authenticate the token and trust the ID?",
    securityBoundary: "Each object action must verify the token's principal owns or is granted the object.",
    test:
      "With B's token, call each object operation once against A's object ID. Record allow/deny per operation. Prove with a single denied-vs-allowed pair; never enumerate at volume.",
    unexpectedBehavior: "A valid but unauthorized token can act on another principal's objects.",
    rootCause: "Authorization implemented at the route/authentication layer but not per object.",
    exploitCondition: "Object IDs are discoverable and the API is reachable with a low-privilege token.",
    impact: "Systematic cross-account access across the API surface — often the single highest-value class.",
    falsePositiveConditions: [
      "Shared workspace/tenant legitimately authorizes the access.",
      "The endpoint is documented as public/unauthenticated by design.",
      "Rate-limit or WAF 200 pages masquerading as success.",
    ],
    detectionHeuristic:
      "Diff two accounts' traffic; any object ID that works cross-account is a BOLA candidate.",
    severityBand: "HIGH",
    duplicateDensity: "MEDIUM",
    surfaceCategories: ["Authorization", "IDOR / BOLA", "API", "GraphQL"],
    requiresHumanApproval: false,
    citations: [
      { source: "OWASP_API_2023", ref: "API1:2023" },
      { source: "CWE", ref: "CWE-639" },
      { source: "HACKTIVITY" },
    ],
  },
  {
    id: "authz-bfla",
    family: "Authorization",
    subfamily: "BFLA",
    title: "Broken Function Level Authorization — privileged operations callable by low-privilege users",
    vulnerabilityPattern:
      "Administrative or elevated functions are protected only by UI visibility or naming convention, not by a server-side role check.",
    applicationContext: "Admin panels, org-management endpoints, and internal APIs exposed to authenticated users.",
    precondition: "A self-owned account WITHOUT the elevated role; the elevated endpoint paths are known (docs/JS).",
    observation:
      "Admin actions are separate routes (e.g. /admin/*, ?role=admin) and the client hides — but the server still serves — them.",
    researchHypothesis: "Can a non-privileged account invoke a privileged function endpoint directly?",
    securityBoundary: "Every privileged function must enforce the caller's role/permission server-side.",
    test:
      "As the low-privilege account, call each candidate admin function ONCE with a benign, reversible payload (or a read-only variant). Record 200 vs 403. Never perform destructive admin actions.",
    unexpectedBehavior: "A member/guest account successfully invokes an owner/admin-only function.",
    rootCause: "Function-level authorization missing or applied inconsistently across methods/routes.",
    exploitCondition: "The privileged route is reachable and its parameters are inferable.",
    impact: "Privilege escalation within the application; can reach full tenant/admin takeover.",
    falsePositiveConditions: [
      "The endpoint is intentionally available to all roles.",
      "A 200 that returns a no-op or validation error, not an actual privileged effect.",
      "The tester's account silently had the role.",
    ],
    detectionHeuristic:
      "Extract every privileged route from client JS; replay each with a low-privilege token.",
    severityBand: "HIGH",
    duplicateDensity: "MEDIUM",
    surfaceCategories: ["Authorization", "Admin Functions", "User Roles", "API"],
    requiresHumanApproval: true,
    citations: [
      { source: "OWASP_API_2023", ref: "API5:2023" },
      { source: "OWASP_TOP10_2021", ref: "A01:2021" },
      { source: "OWASP_WSTG", ref: "WSTG-ATHZ-02" },
    ],
  },
  {
    id: "authz-multitenant",
    family: "Authorization",
    subfamily: "Multi-tenant isolation",
    title: "Cross-tenant isolation break",
    vulnerabilityPattern:
      "A shared backend scopes data by a tenant/org identifier that is either client-supplied or not enforced on every query, letting one tenant reach another's data.",
    applicationContext: "B2B SaaS with organizations/workspaces; shared database with a tenant discriminator column.",
    precondition: "Two self-owned tenants (Org 1, Org 2), each with its own resources.",
    observation:
      "Requests carry an org_id/tenant header or path segment, and changing it is not rejected; or list endpoints occasionally include foreign rows.",
    researchHypothesis: "Can a member of Org 2 read, list, or mutate Org 1 resources?",
    securityBoundary: "Tenants are fully isolated; no request from Org 2 may resolve Org 1 data.",
    test:
      "From Org 2, attempt to access ONE known Org 1 resource id (and try swapping the tenant identifier). Confirm the 403 boundary with a single request. Do not bulk-pull cross-tenant data.",
    unexpectedBehavior: "Org 2 obtains Org 1 data or mutates it.",
    rootCause: "Tenant scoping trusted from client input or omitted from some data-access paths.",
    exploitCondition: "Attacker controls a tenant and can reference or guess another tenant's IDs.",
    impact: "Tenant isolation failure — high-value and frequently unique; can expose entire customer datasets.",
    falsePositiveConditions: [
      "A partner/sharing feature legitimately links the two tenants.",
      "The 'foreign' row is actually global reference data.",
      "Both test tenants were provisioned under one parent org.",
    ],
    detectionHeuristic:
      "Find every place a tenant/org id is accepted from the client; try substituting a second self-owned tenant's id.",
    severityBand: "CRITICAL",
    duplicateDensity: "LOW",
    surfaceCategories: ["Multi-Tenant", "Organization / Team", "Authorization", "API"],
    requiresHumanApproval: true,
    citations: [
      { source: "OWASP_API_2023", ref: "API1:2023" },
      { source: "CWE", ref: "CWE-639" },
      { source: "OWASP_ASVS", ref: "V4 Access Control" },
      { source: "HACKTIVITY" },
    ],
  },
  {
    id: "authz-privesc",
    family: "Authorization",
    subfamily: "Privilege escalation",
    title: "Vertical privilege escalation via parameter or role manipulation",
    vulnerabilityPattern:
      "The role/permission a user operates under is derived from client-influenced input (a field, a token claim, a signup parameter) that the server does not re-validate.",
    applicationContext: "Signup/invite flows, profile update endpoints, and JWT/claim-based authorization.",
    precondition: "A self-owned low-privilege account and visibility into role-bearing fields or claims.",
    observation:
      "A request body or token contains a role/permission/isAdmin-style field, or a mass-update endpoint echoes fields you didn't intend to set.",
    researchHypothesis: "Can a low-privilege user promote their own effective permissions by supplying a role field?",
    securityBoundary: "Roles are assigned and enforced server-side; clients cannot set their own privileges.",
    test:
      "On your OWN account only, submit the role/permission field once and check whether effective access changes. Revert immediately. Never target another user's account.",
    unexpectedBehavior: "The account gains capabilities it should not have after echoing back a privileged field.",
    rootCause: "Trusting client-provided authorization data; missing server-side role derivation.",
    exploitCondition: "A writable path reaches the field that governs authorization.",
    impact: "Self-escalation to higher privilege; combined with BFLA can reach admin.",
    falsePositiveConditions: [
      "The field is accepted but ignored server-side (no real effect).",
      "The 'privilege' gained is cosmetic UI state, not enforced access.",
    ],
    detectionHeuristic: "Look for role/permission/plan fields in write requests and token claims; test on self.",
    severityBand: "HIGH",
    duplicateDensity: "MEDIUM",
    surfaceCategories: ["Authorization", "User Roles", "Authentication"],
    requiresHumanApproval: false,
    citations: [
      { source: "OWASP_TOP10_2021", ref: "A01:2021" },
      { source: "CWE", ref: "CWE-915" },
      { source: "OWASP_ASVS", ref: "V4 Access Control" },
    ],
  },
  {
    id: "authz-role-confusion",
    family: "Authorization",
    subfamily: "Role confusion",
    title: "Role/permission confusion across contexts",
    vulnerabilityPattern:
      "A permission granted in one context (a project, a plan tier, a prior role) is honored in another context where it should not apply, because checks key on the wrong scope.",
    applicationContext: "Products with per-project roles, plan tiers, or multiple membership contexts per user.",
    precondition: "A self-owned account holding a role in context X but not context Y.",
    observation:
      "Permission checks appear global rather than context-scoped; a capability persists after switching projects/orgs.",
    researchHypothesis: "Does a permission valid in context X incorrectly authorize an action in context Y?",
    securityBoundary: "Permissions are evaluated against the specific resource's context, not the user globally.",
    test:
      "Acting only within self-owned contexts, perform a context-Y action while holding only a context-X grant. Confirm allow/deny with one request.",
    unexpectedBehavior: "A context-X role authorizes a context-Y action.",
    rootCause: "Authorization checks scoped to the user or the wrong container rather than the target resource.",
    exploitCondition: "User legitimately holds a role somewhere and can address resources in another context.",
    impact: "Scope-crossing access; severity depends on the sensitivity of context Y.",
    falsePositiveConditions: [
      "The permission is intentionally global by product design.",
      "The two contexts are actually the same scope under the hood.",
    ],
    detectionHeuristic: "Change project/org context but keep the old capability; see if it still applies.",
    severityBand: "MEDIUM",
    duplicateDensity: "LOW",
    surfaceCategories: ["Authorization", "Organization / Team", "User Roles", "Multi-Tenant"],
    requiresHumanApproval: false,
    citations: [
      { source: "OWASP_TOP10_2021", ref: "A01:2021" },
      { source: "OWASP_ASVS", ref: "V4 Access Control" },
      { source: "HACKTIVITY" },
    ],
  },
];

export const AUTHORIZATION_REMEDIATIONS: PatternRemediation[] = [
  { patternId: "authz-idor", remediation: "Enforce an ownership/permission check on every object access, server-side, keyed to the authenticated principal — not the object's existence." },
  { patternId: "authz-bola", remediation: "Centralize per-object authorization in the data-access layer so every API operation verifies the principal's relationship to the object." },
  { patternId: "authz-bfla", remediation: "Deny by default at the function level; require an explicit role/permission check on every privileged route and method." },
  { patternId: "authz-multitenant", remediation: "Derive the tenant from the server-side session, never from client input, and scope every query by it." },
  { patternId: "authz-privesc", remediation: "Assign roles/permissions server-side only; ignore client-supplied role fields and validate token claims against server state." },
  { patternId: "authz-role-confusion", remediation: "Evaluate authorization against the specific target resource's context, not the user globally." },
];
