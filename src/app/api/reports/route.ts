import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, bad, handleError } from "@/lib/api";
import { draftReport } from "@/lib/report";

export async function GET() {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { updatedAt: "desc" },
      include: { program: { select: { name: true } }, finding: { select: { title: true } } },
    });
    return ok(reports);
  } catch (e) {
    return handleError(e);
  }
}

// Generate a report draft from a finding (Report Writer Agent).
const Generate = z.object({
  findingId: z.string(),
  attackerRole: z.string().default("an authenticated low-privilege user"),
  impactPhrase: z.string().default("access data belonging to another user/tenant"),
  prerequisites: z.string().default("Two self-owned test accounts (A and B)."),
  steps: z.array(z.string()).default([]),
  expectedBehavior: z.string().default(""),
  actualBehavior: z.string().default(""),
  whoIsAffected: z.string().default(""),
  maxReasonableImpact: z.string().default(""),
  proof: z.string().default(""),
  remediation: z.string().default(""),
});

export async function POST(req: Request) {
  try {
    const body = Generate.parse(await req.json());
    const finding = await prisma.finding.findUnique({
      where: { id: body.findingId },
      include: { program: true, target: true, evidence: true },
    });
    if (!finding) return bad("Finding not found", 404);

    const markdown = await draftReport({
      vulnType: finding.vulnType,
      attackerRole: body.attackerRole,
      impactPhrase: body.impactPhrase,
      asset: finding.target?.name || finding.program.name,
      summary: finding.summary,
      prerequisites: body.prerequisites,
      steps: body.steps,
      expectedBehavior: body.expectedBehavior,
      actualBehavior: body.actualBehavior,
      whoIsAffected: body.whoIsAffected,
      maxReasonableImpact: body.maxReasonableImpact || finding.businessImpact,
      proof:
        body.proof ||
        finding.evidence.map((e) => `**${e.label}**\n${e.actualResult}`).join("\n\n"),
      remediation: body.remediation,
    });

    const report = await prisma.report.create({
      data: {
        programId: finding.programId,
        findingId: finding.id,
        title: `${finding.vulnType} — ${finding.title}`,
        markdown,
        status: "HUMAN_REVIEW",
      },
    });

    await prisma.researchLog.create({
      data: { kind: "REPORT", refId: report.id, detail: `Drafted report for ${finding.title}`, hours: 0.5 },
    });

    return ok(report, 201);
  } catch (e) {
    return handleError(e);
  }
}
