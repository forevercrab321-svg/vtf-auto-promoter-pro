import type { VulnPattern, PatternRemediation } from "./types";

// ============================================================================
// FAMILY: Authentication
// Session flaws · Password reset · OAuth · Token lifecycle · Account takeover
// ============================================================================

export const AUTHENTICATION_PATTERNS: VulnPattern[] = [
  {
    id: "authn-session-fixation",
    family: "Authentication",
    subfamily: "Session flaws",
    title: "Session not rotated / not invalidated at trust boundaries",
    vulnerabilityPattern:
      "The session identifier is not regenerated on login/privilege change, or old sessions survive logout and password change.",
    applicationContext: "Cookie- or token-based sessions on any authenticated web app.",
    precondition: "A self-owned account; ability to observe your own session identifier before and after an event.",
    observation:
      "The same session token appears before and after login, or a captured token still works after you log out / change password.",
    researchHypothesis:
      "Does the session identifier change on login and become invalid after logout / credential change?",
    securityBoundary: "Sessions rotate on authentication and are revoked on logout and password change.",
    test:
      "On your OWN account, record the session id pre- and post-login; then log out and replay one benign authenticated request. Expect rotation and 401 after logout. Never use another person's session.",
    unexpectedBehavior: "Pre-login token stays valid post-login, or an old token works after logout/password reset.",
    rootCause: "Missing session regeneration and server-side revocation on trust transitions.",
    exploitCondition: "Attacker can plant or capture a victim session token (often needs a second flaw).",
    impact: "Session hijacking / fixation; persistence after the victim believes they logged out.",
    falsePositiveConditions: [
      "Token looks unchanged but its server-side binding actually rotated.",
      "A short grace window before revocation propagates (documented behavior).",
      "The 'old' token was refreshed transparently, not the original.",
    ],
    detectionHeuristic: "Compare session identity across login/logout/password-change on your own account.",
    severityBand: "MEDIUM",
    duplicateDensity: "MEDIUM",
    surfaceCategories: ["Session Management", "Authentication"],
    requiresHumanApproval: false,
    citations: [
      { source: "OWASP_WSTG", ref: "WSTG-SESS-03" },
      { source: "CWE", ref: "CWE-384" },
      { source: "OWASP_ASVS", ref: "V3 Session Management" },
    ],
  },
  {
    id: "authn-password-reset",
    family: "Authentication",
    subfamily: "Password reset",
    title: "Password-reset token weakness (leak, non-expiry, or weak binding)",
    vulnerabilityPattern:
      "The reset token is guessable, long-lived, reusable, leaked via Host/Referer header, or not strictly bound to one account.",
    applicationContext: "Forgot-password flows that email a tokenized reset link.",
    precondition: "One or two self-owned accounts with controllable email addresses.",
    observation:
      "Reset link uses a short/sequential token, the reset request reflects a client-controlled Host header, or the token still works after use.",
    researchHypothesis:
      "Is the reset token unguessable, single-use, short-lived, and bound to exactly one account?",
    securityBoundary: "A reset token authorizes exactly one account, once, within a short window.",
    test:
      "Trigger a reset for your OWN account; inspect token entropy, test one reuse after completion, and check whether a spoofed Host header changes the link. Only ever reset your own accounts.",
    unexpectedBehavior: "Token is reusable/guessable, doesn't expire, or the link host is attacker-controllable.",
    rootCause: "Weak token generation, missing expiry/one-use enforcement, or trusting the Host header.",
    exploitCondition: "Attacker can predict a token or induce a poisoned reset email to a victim.",
    impact: "Account takeover via password reset.",
    falsePositiveConditions: [
      "Token appears reusable but the server actually invalidated it (second attempt no-ops).",
      "Host reflection is cosmetic and the real link uses a server-fixed domain.",
      "Testing against your own mailbox mislabels normal behavior as a bug.",
    ],
    detectionHeuristic: "Examine reset token entropy, expiry, one-use, and Host/Referer influence — on self only.",
    severityBand: "HIGH",
    duplicateDensity: "MEDIUM",
    surfaceCategories: ["Account Recovery", "Authentication"],
    requiresHumanApproval: true,
    citations: [
      { source: "OWASP_WSTG", ref: "WSTG-ATHN-09" },
      { source: "CWE", ref: "CWE-640" },
      { source: "PORTSWIGGER", url: "https://portswigger.net/web-security/authentication" },
    ],
  },
  {
    id: "authn-oauth-redirect",
    family: "Authentication",
    subfamily: "OAuth",
    title: "OAuth redirect_uri / state validation weakness",
    vulnerabilityPattern:
      "The authorization server accepts a redirect_uri that is not strictly pre-registered, or the client omits/ignores the state parameter, enabling code/token leakage or CSRF.",
    applicationContext: "Social login and OAuth2/OIDC flows; 'Sign in with …' buttons.",
    precondition: "A self-owned OAuth client or account on the target's login flow.",
    observation:
      "redirect_uri accepts unregistered values, subdomains, or open-redirect chains; or no state parameter is present.",
    researchHypothesis: "Does the flow strictly bind redirect_uri to a pre-registered value and enforce state?",
    securityBoundary: "Only exact pre-registered redirect URIs are accepted; state ties the callback to the request.",
    test:
      "On your OWN login attempt, modify redirect_uri to a researcher-controlled benign URL and observe whether the code is delivered there. Never send a manipulated link to another user.",
    unexpectedBehavior: "The authorization code/token is delivered to a non-registered redirect target.",
    rootCause: "Loose redirect_uri matching (prefix/substring) or missing state validation.",
    exploitCondition: "Attacker can get a victim to start the flow (phishing-adjacent) — do not actually phish.",
    impact: "Authorization code / token theft leading to account takeover.",
    falsePositiveConditions: [
      "The AS reflects the URI in an error page but does not actually redirect there.",
      "The 'accepted' URI is in fact pre-registered.",
      "state is enforced server-side despite not being obvious in the URL.",
    ],
    detectionHeuristic: "Tamper redirect_uri and drop state on your own flow; watch where the code lands.",
    severityBand: "HIGH",
    duplicateDensity: "MEDIUM",
    surfaceCategories: ["OAuth", "SSO", "Authentication"],
    requiresHumanApproval: true,
    citations: [
      { source: "OWASP_WSTG", ref: "WSTG-ATHZ-05" },
      { source: "CWE", ref: "CWE-601" },
      { source: "PORTSWIGGER", url: "https://portswigger.net/web-security/oauth" },
    ],
  },
  {
    id: "authn-token-lifecycle",
    family: "Authentication",
    subfamily: "Token lifecycle",
    title: "JWT / API token lifecycle and validation flaws",
    vulnerabilityPattern:
      "Tokens are not revoked on logout/role change, accept weak algorithms (alg=none / key confusion), or are not checked for expiry/audience.",
    applicationContext: "Stateless JWT auth, personal access tokens, and API keys.",
    precondition: "A self-owned account that can mint and inspect its own tokens.",
    observation:
      "JWT header allows alg switching, tokens have no/long expiry, or a revoked token keeps working.",
    researchHypothesis:
      "Are tokens validated for signature, algorithm, expiry, and audience, and revoked on trust changes?",
    securityBoundary: "Tokens are cryptographically verified, time-bound, audience-scoped, and revocable.",
    test:
      "On your OWN token, test expiry enforcement and a single revocation replay; inspect alg handling in a lab, not against production signing. Keep it to your own credentials.",
    unexpectedBehavior: "A tampered/expired/revoked token is accepted.",
    rootCause: "Incomplete token validation or absent revocation list.",
    exploitCondition: "Attacker obtains or forges a token the server will accept.",
    impact: "Authentication bypass / persistence.",
    falsePositiveConditions: [
      "Server accepts an 'expired' token that was silently refreshed.",
      "alg=none is rejected despite the request appearing to succeed.",
      "Short revocation-propagation delay documented as expected.",
    ],
    detectionHeuristic: "Check token expiry, revocation-on-logout, and algorithm strictness on self-owned tokens.",
    severityBand: "HIGH",
    duplicateDensity: "MEDIUM",
    surfaceCategories: ["Session Management", "Authentication", "API"],
    requiresHumanApproval: false,
    citations: [
      { source: "OWASP_API_2023", ref: "API2:2023" },
      { source: "CWE", ref: "CWE-287" },
      { source: "OWASP_ASVS", ref: "V3 Session Management" },
    ],
  },
  {
    id: "authn-account-takeover-chain",
    family: "Authentication",
    subfamily: "Account takeover",
    title: "Account takeover via unverified email/identifier change",
    vulnerabilityPattern:
      "A user can change a login-critical identifier (email, phone) without re-verification, or an identifier merge/link flow binds an attacker-controlled identity to a victim account.",
    applicationContext: "Account settings, identity linking, and 'add email' features.",
    precondition: "One or two self-owned accounts with controllable identifiers.",
    observation:
      "Changing the account email doesn't require confirming the new address, or identity-link flows don't verify ownership.",
    researchHypothesis: "Can a login-critical identifier be changed or linked without proving ownership of it?",
    securityBoundary: "Changes to login-critical identifiers require verification of the new identifier.",
    test:
      "On your OWN accounts, attempt an identifier change/link and observe whether verification is enforced. Never target identifiers you don't control.",
    unexpectedBehavior: "The account's login identifier changes without verifying the new value.",
    rootCause: "Missing re-verification / ownership proof on identity-changing operations.",
    exploitCondition: "Attacker can trigger the change against a victim (often needs a chained flaw).",
    impact: "Full account takeover.",
    falsePositiveConditions: [
      "A verification email is actually sent and required before the change lands.",
      "The change is reversible and the account owner is notified/undo is offered.",
    ],
    detectionHeuristic: "Test whether login-critical identifier changes demand verification — on your own accounts.",
    severityBand: "CRITICAL",
    duplicateDensity: "LOW",
    surfaceCategories: ["Authentication", "Account Recovery", "Business Logic"],
    requiresHumanApproval: true,
    citations: [
      { source: "OWASP_WSTG", ref: "WSTG-ATHN-03" },
      { source: "CWE", ref: "CWE-287" },
      { source: "HACKTIVITY" },
    ],
  },
];

export const AUTHENTICATION_REMEDIATIONS: PatternRemediation[] = [
  { patternId: "authn-session-fixation", remediation: "Regenerate the session on login and privilege change; revoke all sessions server-side on logout and password change." },
  { patternId: "authn-password-reset", remediation: "Use high-entropy, single-use, short-lived reset tokens bound to one account; never build reset links from client-controlled Host/Referer." },
  { patternId: "authn-oauth-redirect", remediation: "Match redirect_uri against an exact pre-registered allowlist and enforce the state parameter on every flow." },
  { patternId: "authn-token-lifecycle", remediation: "Validate signature, algorithm, expiry, and audience on every token; maintain a revocation mechanism for logout/role change." },
  { patternId: "authn-account-takeover-chain", remediation: "Require verified ownership of any new login-critical identifier before the change takes effect; notify the account owner." },
];
