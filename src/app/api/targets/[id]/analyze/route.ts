import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, bad, handleError, parseJsonArray } from "@/lib/api";
import { baselineSurface } from "@/lib/attack-surface";
import { suggestHypotheses } from "@/lib/hypotheses";
import { scoreTarget } from "@/lib/opportunity";

const Body = z.object({
  hasApi: z.boolean().optional(),
  hasGraphql: z.boolean().optional(),
  hasOrgs: z.boolean().optional(),
  hasAi: z.boolean().optional(),
  hasPayments: z.boolean().optional(),
});

// Attack Surface Analyst + Vulnerability Hypothesis Agent.
// Runs only for IN_SCOPE targets (no analysis of out-of-scope / unknown assets).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = Body.parse(await req.json().catch(() => ({})));
    const target = await prisma.target.findUnique({
      where: { id: params.id },
      include: { program: true },
    });
    if (!target) return bad("Target not found", 404);
    if (target.scopeStatus !== "IN_SCOPE") {
      return bad(
        `Refusing to analyze a target that is ${target.scopeStatus}. Confirm scope first (Scope Guardian).`,
        409,
      );
    }

    const hasApi = body.hasApi ?? target.program.apiAvailable;
    const surfaces = baselineSurface({
      hasApi,
      hasGraphql: body.hasGraphql,
      hasOrgs: body.hasOrgs,
      hasAi: body.hasAi,
      hasPayments: body.hasPayments,
    });

    // Replace previous auto-generated surface/hypotheses for idempotency.
    await prisma.attackSurfaceItem.deleteMany({ where: { targetId: target.id } });
    await prisma.attackSurfaceItem.createMany({
      data: surfaces.map((s) => ({
        targetId: target.id,
        category: s.category,
        component: s.component,
        priority: s.priority,
        rationale: s.rationale,
      })),
    });

    const categories = surfaces.map((s) => s.category);
    const templates = suggestHypotheses(categories);
    await prisma.hypothesis.deleteMany({ where: { targetId: target.id, status: "PROPOSED" } });
    await prisma.hypothesis.createMany({
      data: templates.map((t) => ({
        targetId: target.id,
        title: t.title,
        category: t.category,
        precondition: t.precondition,
        expectedSecureBehavior: t.expectedSecureBehavior,
        testStrategy: t.testStrategy,
        riskLevel: t.riskLevel,
        automationAllowed: false,
        humanApprovalRequired: t.humanApprovalRequired,
        potentialImpact: t.potentialImpact,
        status: "PROPOSED",
      })),
    });

    // Prioritise the target based on high-value surface density.
    const highValue = surfaces.filter((s) => s.priority === "HIGH").length;
    const ps = scoreTarget({
      scopeStatus: target.scopeStatus,
      highValueSurfaces: highValue,
      totalSurfaces: surfaces.length,
      hasApi,
    });
    await prisma.target.update({
      where: { id: target.id },
      data: { priority: ps.priority, priorityScore: ps.score },
    });

    await prisma.researchLog.create({
      data: {
        kind: "HYPOTHESIS",
        refId: target.id,
        detail: `Mapped ${surfaces.length} surfaces, ${templates.length} hypotheses`,
        hours: 0.5,
      },
    });

    return ok({
      surfaces,
      hypotheses: templates.length,
      priority: ps.priority,
      priorityScore: ps.score,
      techStack: parseJsonArray(target.techStack),
    });
  } catch (e) {
    return handleError(e);
  }
}
