import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, bad, handleError, parseJsonArray } from "@/lib/api";
import { checkScope, type ScopeRuleInput } from "@/lib/scope-guardian";

const Create = z.object({
  programId: z.string(),
  name: z.string().min(1),
  url: z.string().optional(),
  targetType: z.enum(["web", "api", "mobile", "source"]).default("web"),
  techStack: z.array(z.string()).default([]),
  notes: z.string().default(""),
});

export async function GET() {
  try {
    const targets = await prisma.target.findMany({
      orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
      include: {
        program: { select: { name: true, platform: true } },
        _count: { select: { attackSurfaces: true, hypotheses: true, tests: true, findings: true } },
      },
    });
    return ok(targets);
  } catch (e) {
    return handleError(e);
  }
}

// Creating a target immediately runs the Scope Guardian and caches the verdict
// as GREEN / YELLOW / RED so the dashboard shows safety at a glance.
export async function POST(req: Request) {
  try {
    const body = Create.parse(await req.json());
    const program = await prisma.program.findUnique({
      where: { id: body.programId },
      include: { scopeRules: true },
    });
    if (!program) return bad("Program not found", 404);

    const rules: ScopeRuleInput[] = program.scopeRules.map((r) => ({
      kind: r.kind as "ALLOW" | "BLOCK",
      ruleType: r.ruleType as ScopeRuleInput["ruleType"],
      pattern: r.pattern,
    }));
    const decision = checkScope({
      target: body.url || body.name,
      rules,
      programProhibited: parseJsonArray(program.prohibitedTesting),
    });

    const target = await prisma.target.create({
      data: {
        programId: body.programId,
        name: body.name,
        url: body.url,
        targetType: body.targetType,
        techStack: JSON.stringify(body.techStack),
        notes: body.notes,
        scopeStatus: decision.status,
        safetyState: decision.safetyState,
        scopeReason: decision.reason,
      },
    });

    await prisma.researchLog.create({
      data: { kind: "TARGET_REVIEWED", refId: target.id, detail: `Target ${target.name} (${decision.status})`, hours: 0.25 },
    });

    return ok({ target, decision }, 201);
  } catch (e) {
    return handleError(e);
  }
}
