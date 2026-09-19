import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, bad, handleError } from "@/lib/api";
import { scoreProgram } from "@/lib/opportunity";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const program = await prisma.program.findUnique({
      where: { id: params.id },
      include: {
        scopeRules: { orderBy: { createdAt: "asc" } },
        assets: true,
        targets: true,
        authorizations: { orderBy: { createdAt: "desc" } },
        findings: true,
      },
    });
    if (!program) return bad("Program not found", 404);
    return ok(program);
  } catch (e) {
    return handleError(e);
  }
}

const Patch = z.object({
  notes: z.string().optional(),
  policyText: z.string().optional(),
  automatedTestingAllowed: z.boolean().optional(),
  safeHarbor: z.boolean().optional(),
  maxBounty: z.number().int().nullable().optional(),
  rescore: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = Patch.parse(await req.json());
    const existing = await prisma.program.findUnique({ where: { id: params.id } });
    if (!existing) return bad("Program not found", 404);

    const data: Record<string, unknown> = {};
    for (const k of ["notes", "policyText", "automatedTestingAllowed", "safeHarbor", "maxBounty"] as const) {
      if (body[k] !== undefined) data[k] = body[k];
    }

    if (body.rescore) {
      const merged = { ...existing, ...data } as typeof existing;
      const score = scoreProgram({
        minBounty: merged.minBounty,
        maxBounty: merged.maxBounty,
        bountyAvailable: merged.bountyAvailable,
        wildcardScope: merged.wildcardScope,
        scopeSize: merged.scopeSize,
        apiAvailable: merged.apiAvailable,
        mobileAvailable: merged.mobileAvailable,
        sourceCodeAvailable: merged.sourceCodeAvailable,
        publicProgram: merged.publicProgram,
        safeHarbor: merged.safeHarbor,
        automatedTestingAllowed: merged.automatedTestingAllowed,
      });
      data.opportunityScore = score.score;
      data.priority = score.priority;
      data.intelligence = JSON.stringify(score);
    }

    const program = await prisma.program.update({ where: { id: params.id }, data });
    return ok(program);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.program.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
