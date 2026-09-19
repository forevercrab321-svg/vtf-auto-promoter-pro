// OPERATIONS MANAGER — builds the Daily Security Research Brief and the
// "next highest-value actions" list, all from the current database state.

import { prisma } from "./db";
import { computeMetrics } from "./metrics";

export interface Brief {
  date: string;
  programsAnalyzed: number;
  targetsPrioritized: number;
  attackSurfacesMapped: number;
  hypothesesGenerated: number;
  testsCompleted: number;
  potentialFindings: number;
  confirmedFindings: number;
  reportsReady: number;
  reportsSubmitted: number;
  acceptedReports: number;
  duplicateReports: number;
  reward: number;
  nextActions: string[];
}

export async function buildBrief(): Promise<Brief> {
  const m = await computeMetrics();
  const [attackSurfacesMapped, testsCompleted, priorityATargets, pendingApprovals, readyReports] =
    await Promise.all([
      prisma.attackSurfaceItem.count(),
      prisma.safeTest.count({ where: { status: "EXECUTED" } }),
      prisma.target.findMany({
        where: { priority: "A", scopeStatus: "IN_SCOPE" },
        select: { name: true },
        take: 3,
      }),
      prisma.approval.count({ where: { status: "PENDING" } }),
      prisma.report.count({ where: { status: "READY_TO_SUBMIT" } }),
    ]);

  const nextActions: string[] = [];
  if (pendingApprovals > 0)
    nextActions.push(`Review ${pendingApprovals} pending approval(s) in the Approvals queue.`);
  if (readyReports > 0)
    nextActions.push(`Submit ${readyReports} report(s) marked READY_TO_SUBMIT.`);
  for (const t of priorityATargets)
    nextActions.push(`Advance Priority-A target: ${t.name} (map surface → hypotheses → safe test).`);
  if (m.confirmedFindings > m.reportsReady)
    nextActions.push(`Draft reports for ${m.confirmedFindings - m.reportsReady} confirmed finding(s).`);
  if (nextActions.length === 0)
    nextActions.push("Add or import an authorized program, then confirm its scope with the Scope Guardian.");

  return {
    date: new Date().toISOString().slice(0, 10),
    programsAnalyzed: m.programsTracked,
    targetsPrioritized: m.targetsInScope,
    attackSurfacesMapped,
    hypothesesGenerated: m.hypotheses,
    testsCompleted,
    potentialFindings: m.potentialFindings,
    confirmedFindings: m.confirmedFindings,
    reportsReady: m.reportsReady,
    reportsSubmitted: m.reportsSubmitted,
    acceptedReports: m.accepted,
    duplicateReports: m.duplicate,
    reward: m.totalRewards,
    nextActions,
  };
}
