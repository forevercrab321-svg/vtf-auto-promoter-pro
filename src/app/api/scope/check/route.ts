import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, bad, handleError, parseJsonArray } from "@/lib/api";
import { checkScope, type ScopeRuleInput } from "@/lib/scope-guardian";

const Body = z.object({
  programId: z.string(),
  target: z.string().min(1),
  plannedTestType: z.string().default(""),
});

// Scope Guardian check. This never guesses — if no rule matches, SCOPE_UNKNOWN.
export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());
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
      target: body.target,
      plannedTestType: body.plannedTestType,
      rules,
      programProhibited: parseJsonArray(program.prohibitedTesting),
    });

    await prisma.agentRun.create({
      data: {
        agent: "ScopeGuardian",
        action: "checkScope",
        input: JSON.stringify(body),
        output: JSON.stringify(decision),
        verdict: decision.status === "IN_SCOPE" ? "ALLOW" : decision.status === "OUT_OF_SCOPE" ? "BLOCK" : "INFO",
      },
    });

    return ok(decision);
  } catch (e) {
    return handleError(e);
  }
}
