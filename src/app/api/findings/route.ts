import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, bad, handleError } from "@/lib/api";

const Create = z.object({
  programId: z.string(),
  targetId: z.string().optional(),
  testId: z.string().optional(),
  title: z.string().min(1),
  vulnType: z.string().default("Authorization"),
  severity: z.enum(["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  summary: z.string().default(""),
  businessImpact: z.string().default(""),
});

export async function GET() {
  try {
    const findings = await prisma.finding.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        program: { select: { name: true } },
        target: { select: { name: true } },
        _count: { select: { evidence: true, reports: true } },
      },
    });
    return ok(findings);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const body = Create.parse(await req.json());
    const program = await prisma.program.findUnique({ where: { id: body.programId } });
    if (!program) return bad("Program not found", 404);

    const finding = await prisma.finding.create({
      data: {
        programId: body.programId,
        targetId: body.targetId,
        testId: body.testId,
        title: body.title,
        vulnType: body.vulnType,
        severity: body.severity,
        summary: body.summary,
        businessImpact: body.businessImpact,
        validationState: "POTENTIAL",
        submissionState: "DRAFT",
      },
    });
    await prisma.researchLog.create({
      data: { kind: "FINDING", refId: finding.id, detail: `Potential finding: ${finding.title}`, hours: 0.5 },
    });
    return ok(finding, 201);
  } catch (e) {
    return handleError(e);
  }
}
