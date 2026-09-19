import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, bad, handleError, parseJsonArray } from "@/lib/api";
import { checkScope, tokenExpiry, type ScopeRuleInput } from "@/lib/scope-guardian";

const Body = z.object({
  programId: z.string(),
  target: z.string().min(1),
  assetType: z.string().default("web"),
  plannedTestType: z.string().min(1),
  days: z.number().int().min(1).max(30).default(7),
});

export async function GET() {
  try {
    const tokens = await prisma.authorizationToken.findMany({
      orderBy: { createdAt: "desc" },
      include: { program: { select: { name: true } } },
    });
    return ok(tokens);
  } catch (e) {
    return handleError(e);
  }
}

// Issue an Authorization Token ONLY if the Scope Guardian says IN_SCOPE.
// SCOPE_UNKNOWN or OUT_OF_SCOPE → refused. No token, no testing.
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

    if (decision.status !== "IN_SCOPE") {
      await prisma.agentRun.create({
        data: {
          agent: "ScopeGuardian",
          action: "issueToken:refused",
          input: JSON.stringify(body),
          output: JSON.stringify(decision),
          verdict: "BLOCK",
        },
      });
      return bad(
        `Authorization refused — scope status is ${decision.status}. ${decision.reason}`,
        409,
      );
    }

    const token = await prisma.authorizationToken.create({
      data: {
        programId: program.id,
        target: body.target,
        assetType: body.assetType,
        plannedTestType: body.plannedTestType,
        scopeVerified: true,
        ruleSource: decision.matchedRule
          ? `${decision.matchedRule.ruleType}:${decision.matchedRule.pattern}`
          : "scope-guardian",
        rateLimit: program.rateLimit ?? undefined,
        status: "ACTIVE",
        expiresAt: tokenExpiry(body.days),
      },
    });

    await prisma.agentRun.create({
      data: {
        agent: "ScopeGuardian",
        action: "issueToken",
        input: JSON.stringify(body),
        output: JSON.stringify({ tokenId: token.id, decision }),
        verdict: "ALLOW",
      },
    });

    return ok({ token, decision }, 201);
  } catch (e) {
    return handleError(e);
  }
}
