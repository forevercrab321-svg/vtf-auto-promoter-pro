import type { VulnPattern, PatternRemediation } from "./types";

// ============================================================================
// FAMILY: Business Logic
// State manipulation · Workflow bypass · Race condition · Pricing · Coupon abuse · Invitation abuse
// ============================================================================

export const BUSINESS_LOGIC_PATTERNS: VulnPattern[] = [
  {
    id: "biz-state-manipulation",
    family: "BusinessLogic",
    subfamily: "State manipulation",
    title: "Object state forced into an invalid transition",
    vulnerabilityPattern:
      "A resource's state (order status, subscription tier, KYC level) can be set directly by the client instead of only through the server's allowed transitions.",
    applicationContext: "Order/checkout, subscription, and approval workflows exposing a status field.",
    precondition: "A self-owned object in a known starting state.",
    observation:
      "A status/state field is writable in requests, or an endpoint accepts a target state without checking the current one.",
    researchHypothesis: "Can the client move an object to a state that the workflow should forbid from its current state?",
    securityBoundary: "State transitions follow the server's state machine; the client cannot set arbitrary states.",
    test:
      "On a self-owned object, attempt one illegal transition (e.g. set 'paid' without paying) and observe enforcement. Revert; never touch others' objects or real payment rails.",
    unexpectedBehavior: "The object enters a state it should not be able to reach from its current one.",
    rootCause: "Missing server-side state-machine validation; trusting a client-supplied state value.",
    exploitCondition: "A writable path reaches the state field.",
    impact: "Fraud, entitlement bypass, or workflow integrity loss depending on the state.",
    falsePositiveConditions: [
      "The transition is legitimately allowed for your role/plan.",
      "The state is accepted but a backend job reverts it.",
      "It's a sandbox/test mode where such transitions are expected.",
    ],
    detectionHeuristic: "Find status/state fields; try a transition the UI never offers.",
    severityBand: "HIGH",
    duplicateDensity: "LOW",
    surfaceCategories: ["Business Logic", "Payments", "Subscription"],
    requiresHumanApproval: true,
    citations: [
      { source: "OWASP_WSTG", ref: "WSTG-BUSL-01" },
      { source: "CWE", ref: "CWE-840" },
      { source: "HACKTIVITY" },
    ],
  },
  {
    id: "biz-workflow-bypass",
    family: "BusinessLogic",
    subfamily: "Workflow bypass",
    title: "Multi-step workflow step skipped or reordered",
    vulnerabilityPattern:
      "A sequential process (verify → approve → provision) can be completed out of order or with a step skipped because each step doesn't verify prior steps completed.",
    applicationContext: "Onboarding, checkout, KYC, and multi-stage approval flows.",
    precondition: "A self-owned account partway through a known multi-step flow.",
    observation:
      "Later-step endpoints are directly callable; step order is enforced only by the client's page flow.",
    researchHypothesis: "Can a later step be invoked directly without completing the required earlier steps?",
    securityBoundary: "Each step verifies that all mandatory prior steps completed for this actor/resource.",
    test:
      "On your OWN flow, call a later-step endpoint directly (skipping an earlier one) and observe whether it's rejected. Single attempt; reversible.",
    unexpectedBehavior: "A gated outcome is reached without satisfying prerequisites.",
    rootCause: "Server treats each step statelessly; no verification of the workflow's prior progress.",
    exploitCondition: "Later-step endpoints are reachable and their parameters inferable.",
    impact: "Bypassing payment, verification, or approval gates.",
    falsePositiveConditions: [
      "The skipped step is optional by design.",
      "A backend check later rejects the incomplete flow.",
    ],
    detectionHeuristic: "Enumerate a flow's step endpoints; call step N without step N-1.",
    severityBand: "HIGH",
    duplicateDensity: "LOW",
    surfaceCategories: ["Business Logic", "Authentication", "Payments"],
    requiresHumanApproval: true,
    citations: [
      { source: "OWASP_WSTG", ref: "WSTG-BUSL-06" },
      { source: "CWE", ref: "CWE-841" },
      { source: "HACKTIVITY" },
    ],
  },
  {
    id: "biz-race-condition",
    family: "BusinessLogic",
    subfamily: "Race condition",
    title: "Time-of-check/time-of-use race on a limited resource",
    vulnerabilityPattern:
      "A quantity or one-time action (redeem, withdraw, apply) is validated then applied non-atomically, so concurrent requests each pass the check.",
    applicationContext: "Coupon redemption, balance withdrawal, invite acceptance, and any 'once only' action.",
    precondition: "A self-owned resource limited to N uses (ideally N=1) that you own end-to-end.",
    observation: "A limit (once/one-per-account) exists, and the check-then-apply is not clearly atomic.",
    researchHypothesis: "Do a small number of concurrent requests each pass the limit check?",
    securityBoundary: "Limited actions are enforced atomically; concurrency cannot exceed the limit.",
    test:
      "On your OWN limited resource, send a SMALL burst (e.g. 2–5 parallel requests) once and observe whether the limit is exceeded. Keep concurrency minimal — this must not stress the service. If a safe burst can't be bounded, route to human approval instead.",
    unexpectedBehavior: "The limited action succeeds more times than the limit allows.",
    rootCause: "Non-atomic check-then-act without a lock, unique constraint, or transaction.",
    exploitCondition: "Attacker can send concurrent requests to the same limited action.",
    impact: "Double-spend, over-redemption, or quota bypass with direct financial impact.",
    falsePositiveConditions: [
      "Apparent duplicates are idempotent (same result recorded once).",
      "A backend reconciliation later voids the extra actions.",
      "The 'limit' was never meant to be one-time.",
    ],
    detectionHeuristic: "For any 'once' action, ask whether check and apply are atomic; test with a tiny parallel burst on self.",
    severityBand: "HIGH",
    duplicateDensity: "LOW",
    surfaceCategories: ["Business Logic", "Payments", "Coupons", "Referral", "Invitations"],
    requiresHumanApproval: true,
    citations: [
      { source: "OWASP_WSTG", ref: "WSTG-BUSL-01" },
      { source: "CWE", ref: "CWE-362" },
      { source: "PORTSWIGGER", url: "https://portswigger.net/web-security/race-conditions" },
    ],
  },
  {
    id: "biz-pricing-tampering",
    family: "BusinessLogic",
    subfamily: "Pricing",
    title: "Client-controlled price / amount trusted by the server",
    vulnerabilityPattern:
      "The price, quantity, or currency of a purchase is taken from the client request and not re-derived/validated server-side.",
    applicationContext: "Cart/checkout, in-app purchases, and any 'amount' field in a payment request.",
    precondition: "A self-owned test account able to reach checkout in a sandbox/test mode.",
    observation: "The purchase request contains a price/amount/currency field editable by the client.",
    researchHypothesis: "Does the server re-derive the authoritative price, or trust the client's amount?",
    securityBoundary: "Price and totals are computed server-side from catalog data; client amounts are ignored.",
    test:
      "In a sandbox/test-payment context on your OWN account, alter the amount once and see whether the server recomputes it. Never execute a real charge or use real payment instruments.",
    unexpectedBehavior: "The order is accepted at a client-chosen (e.g. lowered or negative) price.",
    rootCause: "Trusting client-supplied monetary values instead of server-side pricing.",
    exploitCondition: "Checkout accepts and honors a client amount.",
    impact: "Financial loss via underpayment; possible negative-amount refunds.",
    falsePositiveConditions: [
      "The tampered amount is echoed but the real charge uses the server price.",
      "Only sandbox mode is affected; production recomputes.",
    ],
    detectionHeuristic: "Look for price/amount/currency in purchase requests; try recompute-bypass in test mode.",
    severityBand: "HIGH",
    duplicateDensity: "LOW",
    surfaceCategories: ["Business Logic", "Payments", "Subscription"],
    requiresHumanApproval: true,
    citations: [
      { source: "OWASP_WSTG", ref: "WSTG-BUSL-07" },
      { source: "CWE", ref: "CWE-472" },
      { source: "HACKTIVITY" },
    ],
  },
  {
    id: "biz-coupon-abuse",
    family: "BusinessLogic",
    subfamily: "Coupon abuse",
    title: "Coupon / promo stacking or reuse beyond intent",
    vulnerabilityPattern:
      "Single-use or non-stackable discount codes can be reused, stacked, or applied to ineligible items due to missing server-side constraints.",
    applicationContext: "E-commerce and subscription checkout with promo/coupon codes.",
    precondition: "A self-owned account and one or more test coupon codes valid for your account.",
    observation: "Applying the same code twice, or two codes together, is not rejected client-side or server-side.",
    researchHypothesis: "Can a single-use/non-stackable coupon be reused or stacked to exceed intended discount?",
    securityBoundary: "Coupon constraints (single-use, non-stacking, eligibility) are enforced server-side.",
    test:
      "On your OWN order in test mode, attempt one reuse/stack and observe enforcement. No real purchase; revert the cart.",
    unexpectedBehavior: "Discount exceeds the intended maximum via reuse/stacking.",
    rootCause: "Coupon rules enforced only in the UI or not transactionally.",
    exploitCondition: "The discount endpoint accepts repeated/combined codes.",
    impact: "Revenue loss; at scale, meaningful fraud.",
    falsePositiveConditions: [
      "The codes are intentionally stackable.",
      "The extra discount is voided at final settlement.",
    ],
    detectionHeuristic: "Reapply and combine codes; check server-side rejection, not just UI.",
    severityBand: "MEDIUM",
    duplicateDensity: "MEDIUM",
    surfaceCategories: ["Business Logic", "Coupons", "Payments"],
    requiresHumanApproval: false,
    citations: [
      { source: "OWASP_WSTG", ref: "WSTG-BUSL-05" },
      { source: "CWE", ref: "CWE-840" },
      { source: "HACKTIVITY" },
    ],
  },
  {
    id: "biz-invitation-abuse",
    family: "BusinessLogic",
    subfamily: "Invitation abuse",
    title: "Invitation/referral token misbinding or reuse",
    vulnerabilityPattern:
      "An invite or referral token is not strictly bound to the intended recipient/role/tenant, or can be reused, letting the wrong party redeem it or gain unintended access.",
    applicationContext: "Team invites, referral programs, and shared-link onboarding.",
    precondition: "Two self-owned accounts; an invite generated for one of them.",
    observation: "The invite token is generic, reusable, or its recipient/role isn't checked at redemption.",
    researchHypothesis: "Can an invite intended for A be redeemed by B, or grant more access/role than intended?",
    securityBoundary: "An invite redeems once, for the intended recipient, at the intended role/tenant.",
    test:
      "Generate an invite to A (self-owned), attempt redemption from B (self-owned), and check role/tenant binding. Single attempt; only your own accounts.",
    unexpectedBehavior: "B redeems A's invite, or the redemption grants a higher role/other tenant.",
    rootCause: "Weak binding of the token to recipient/role/tenant, or missing one-use enforcement.",
    exploitCondition: "Attacker can obtain or guess an invite token.",
    impact: "Unauthorized team/tenant access or privilege via invitation.",
    falsePositiveConditions: [
      "Open invite links are intentional for the feature.",
      "The role granted matches the invite's design.",
    ],
    detectionHeuristic: "Test invite recipient-binding, role-binding, and one-use — across two self-owned accounts.",
    severityBand: "MEDIUM",
    duplicateDensity: "LOW",
    surfaceCategories: ["Invitations", "Referral", "Business Logic", "Organization / Team"],
    requiresHumanApproval: false,
    citations: [
      { source: "OWASP_WSTG", ref: "WSTG-BUSL-06" },
      { source: "CWE", ref: "CWE-639" },
      { source: "HACKTIVITY" },
    ],
  },
];

export const BUSINESS_LOGIC_REMEDIATIONS: PatternRemediation[] = [
  { patternId: "biz-state-manipulation", remediation: "Enforce a server-side state machine; reject any transition not valid from the object's current state, and never accept a client-set state." },
  { patternId: "biz-workflow-bypass", remediation: "Make each workflow step verify server-side that all mandatory prior steps completed for this actor/resource." },
  { patternId: "biz-race-condition", remediation: "Apply limited actions atomically — database transactions, unique constraints, or locks — so concurrency cannot exceed the limit." },
  { patternId: "biz-pricing-tampering", remediation: "Compute prices and totals server-side from authoritative catalog data; ignore client-supplied amounts." },
  { patternId: "biz-coupon-abuse", remediation: "Enforce coupon single-use, stacking, and eligibility rules transactionally on the server." },
  { patternId: "biz-invitation-abuse", remediation: "Bind invite tokens to recipient, role, and tenant; enforce single-use and verify all three at redemption." },
];
