// ============================================================================
// REWARD / ROI metrics. Optimises for Expected Research Value, not scan volume.
// No revenue is promised — these are efficiency and acceptance-quality signals.
// ============================================================================

import { prisma } from "./db";

export interface Metrics {
  programsTracked: number;
  priorityA: number;
  targetsInScope: number;
  hypotheses: number;
  testsPlanned: number;
  potentialFindings: number;
  confirmedFindings: number;
  reportsReady: number;
  reportsSubmitted: number;
  accepted: number;
  duplicate: number;
  informative: number;
  na: number;
  totalRewards: number;
  researchHours: number;
  rewardPerHour: number;
  acceptanceRate: number; // accepted / submitted
  duplicateRate: number; // duplicate / submitted
  averageReward: number; // per accepted
  pendingApprovals: number;
}

export async function computeMetrics(): Promise<Metrics> {
  const [
    programsTracked,
    priorityA,
    targetsInScope,
    hypotheses,
    testsPlanned,
    findings,
    reportsReady,
    reportsSubmitted,
    pendingApprovals,
    logs,
  ] = await Promise.all([
    prisma.program.count(),
    prisma.program.count({ where: { priority: "A" } }),
    prisma.target.count({ where: { scopeStatus: "IN_SCOPE" } }),
    prisma.hypothesis.count(),
    prisma.safeTest.count(),
    prisma.finding.findMany({
      select: { validationState: true, submissionState: true, bountyAmount: true },
    }),
    prisma.report.count({ where: { status: "READY_TO_SUBMIT" } }),
    prisma.report.count({ where: { status: "SUBMITTED" } }),
    prisma.approval.count({ where: { status: "PENDING" } }),
    prisma.researchLog.findMany({ select: { hours: true } }),
  ]);

  const potentialFindings = findings.filter((f) => f.validationState === "POTENTIAL").length;
  const confirmedFindings = findings.filter((f) => f.validationState === "CONFIRMED").length;

  const submitted = findings.filter((f) =>
    ["SUBMITTED", "ACCEPTED", "DUPLICATE", "INFORMATIVE", "NA"].includes(f.submissionState),
  );
  const accepted = findings.filter((f) => f.submissionState === "ACCEPTED");
  const duplicate = findings.filter((f) => f.submissionState === "DUPLICATE").length;
  const informative = findings.filter((f) => f.submissionState === "INFORMATIVE").length;
  const na = findings.filter((f) => f.submissionState === "NA").length;

  const totalRewards = accepted.reduce((sum, f) => sum + (f.bountyAmount ?? 0), 0);
  const researchHours = logs.reduce((sum, l) => sum + (l.hours ?? 0), 0);

  const submittedCount = submitted.length;
  return {
    programsTracked,
    priorityA,
    targetsInScope,
    hypotheses,
    testsPlanned,
    potentialFindings,
    confirmedFindings,
    reportsReady,
    reportsSubmitted,
    accepted: accepted.length,
    duplicate,
    informative,
    na,
    totalRewards,
    researchHours: Math.round(researchHours * 10) / 10,
    rewardPerHour: researchHours > 0 ? Math.round(totalRewards / researchHours) : 0,
    acceptanceRate: submittedCount > 0 ? Math.round((accepted.length / submittedCount) * 100) : 0,
    duplicateRate: submittedCount > 0 ? Math.round((duplicate / submittedCount) * 100) : 0,
    averageReward: accepted.length > 0 ? Math.round(totalRewards / accepted.length) : 0,
    pendingApprovals,
  };
}
