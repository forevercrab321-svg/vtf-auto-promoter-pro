// ============================================================================
// SECURITY SUPERVISOR  — the gate every action passes before execution.
//
// Answers 9 questions. If Q1/Q2/Q3 are not a clear YES → BLOCK.
// If any sensitive condition is true → HUMAN_APPROVAL_REQUIRED.
// Otherwise → ALLOW. This is deterministic; agents cannot override it.
// ============================================================================

import type { SupervisorVerdict } from "./types";

export interface SupervisorInput {
  programAuthorized: boolean; // Q1: program explicitly authorized?
  targetInScope: boolean; // Q2: target explicitly IN_SCOPE (not unknown)?
  techniqueAllowed: boolean; // Q3: technique allowed (not prohibited)?
  automatedTestingAllowed: boolean; // Q4
  rateSafe: boolean; // Q5
  couldAffectOtherUsers: boolean; // Q6
  couldModifyOrDestroyData: boolean; // Q7
  couldDisruptService: boolean; // Q8
  // Extra sensitive flags feeding "Q9: human approval required?"
  couldReadOthersData?: boolean;
  couldIncurCost?: boolean;
  couldSendMessages?: boolean; // email / SMS
  couldCreateManyResources?: boolean;
  policyUnclear?: boolean;
  needsScopeExpansionToProve?: boolean;
}

export interface SupervisorResult {
  verdict: SupervisorVerdict;
  answers: Record<string, boolean>;
  blockers: string[]; // reasons for BLOCK
  approvalReasons: string[]; // reasons for HUMAN_APPROVAL_REQUIRED
  humanApprovalRequired: boolean;
}

export function runSupervisor(input: SupervisorInput): SupervisorResult {
  const answers: Record<string, boolean> = {
    "Q1 program authorized": !!input.programAuthorized,
    "Q2 target in scope": !!input.targetInScope,
    "Q3 technique allowed": !!input.techniqueAllowed,
    "Q4 automated testing allowed": !!input.automatedTestingAllowed,
    "Q5 rate safe": !!input.rateSafe,
    "Q6 could affect other users": !!input.couldAffectOtherUsers,
    "Q7 could modify/destroy data": !!input.couldModifyOrDestroyData,
    "Q8 could disrupt service": !!input.couldDisruptService,
  };

  const blockers: string[] = [];
  if (!input.programAuthorized) blockers.push("Program is not explicitly authorized (Q1).");
  if (!input.targetInScope) blockers.push("Target is not explicitly in scope (Q2).");
  if (!input.techniqueAllowed) blockers.push("Testing technique is not allowed / is prohibited (Q3).");

  // Q1/Q2/Q3 are non-negotiable. Any NO → BLOCK.
  if (blockers.length > 0) {
    return {
      verdict: "BLOCK",
      answers,
      blockers,
      approvalReasons: [],
      humanApprovalRequired: false,
    };
  }

  // Sensitive conditions → require a human before proceeding.
  const approvalReasons: string[] = [];
  if (input.couldReadOthersData) approvalReasons.push("Test may read other real users' data.");
  if (input.couldAffectOtherUsers) approvalReasons.push("Test may affect other users.");
  if (input.couldModifyOrDestroyData)
    approvalReasons.push("Test may modify or destroy data.");
  if (input.couldDisruptService) approvalReasons.push("Test may disrupt the service.");
  if (input.couldIncurCost) approvalReasons.push("Test may incur cost or execute a payment.");
  if (input.couldSendMessages) approvalReasons.push("Test may send emails/SMS to real people.");
  if (input.couldCreateManyResources)
    approvalReasons.push("Test may create a large number of resources / hit rate limits.");
  if (!input.rateSafe) approvalReasons.push("Request rate may be unsafe (Q5).");
  if (input.policyUnclear) approvalReasons.push("Program policy is unclear.");
  if (input.needsScopeExpansionToProve)
    approvalReasons.push("Proving impact would require expanding scope.");
  if (!input.automatedTestingAllowed)
    approvalReasons.push(
      "Automated testing is not permitted by this program — a human must run/confirm each step.",
    );

  if (approvalReasons.length > 0) {
    return {
      verdict: "HUMAN_APPROVAL_REQUIRED",
      answers,
      blockers: [],
      approvalReasons,
      humanApprovalRequired: true,
    };
  }

  return {
    verdict: "ALLOW",
    answers,
    blockers: [],
    approvalReasons: [],
    humanApprovalRequired: false,
  };
}

/** Human-readable one-line summary of a supervisor result. */
export function summarizeVerdict(r: SupervisorResult): string {
  if (r.verdict === "BLOCK") return `BLOCK — ${r.blockers.join(" ")}`;
  if (r.verdict === "HUMAN_APPROVAL_REQUIRED")
    return `HUMAN APPROVAL REQUIRED — ${r.approvalReasons.join(" ")}`;
  return "ALLOW — all safety checks passed.";
}
