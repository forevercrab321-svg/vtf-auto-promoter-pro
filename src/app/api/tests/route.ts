import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, bad, handleError, parseJsonArray } from "@/lib/api";
import { runSupervisor } from "@/lib/supervisor";
import { checkScope, type ScopeRuleInput } from "@/lib/scope-guardian";

const Create = z.object({
  targetId: z.string(),
  hypothesisId: z.string().optional(),
  authorizationId: z.string().optional(),
  title: z.string().min(1),
  plannedAction: z.string().default(""),
  potentialImpact: z.string().default(""),
  // safety self-assessment feeding the Supervisor's 9-question gate
  rateSafe: z.boolean().default(true),
  couldAffectOtherUsers: z.boolean().default(false),
  couldReadOthersData: z.boolean().default(false),
  couldModifyOrDestroyData: z.boolean().default(false),
  couldDisruptService: z.boolean().default(false),
  couldIncurCost: z.boolean().default(false),
  couldSendMessages: z.boolean().default(false),
  couldCreateManyResources: z.boolean().default(false),
});

export async function GET() {
  try {
    const tests = await prisma.safeTest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        target: { select: { name: true, safetyState: true, scopeStatus: true, programId: true } },
        authorization: { select: { status: true, expiresAt: true } },
      },
    });
    return ok(tests);
  } catch (e) {
    return handleError(e);
  }
}

// Create a Safe Test task. It only becomes AUTHORIZED after passing the full
// gate: valid Authorization Token + Scope Guardian IN_SCOPE + Supervisor ALLOW.
export async function POST(req: Request) {
  try {
    const body = Create.parse(await req.json());
    const target = await prisma.target.findUnique({
      where: { id: body.targetId },
      include: { program: { include: { scopeRules: true } } },
    });
    if (!target) return bad("Target not found", 404);

    const program = target.program;
    const plannedTestType = body.plannedAction || body.title;

    // Re-verify scope live (never trust a cached verdict for execution).
    const rules: ScopeRuleInput[] = program.scopeRules.map((r) => ({
      kind: r.kind as "ALLOW" | "BLOCK",
      ruleType: r.ruleType as ScopeRuleInput["ruleType"],
      pattern: r.pattern,
    }));
    const scope = checkScope({
      target: target.url || target.name,
      plannedTestType,
      rules,
      programProhibited: parseJsonArray(program.prohibitedTesting),
    });

    // Validate the authorization token if supplied.
    let authValid = false;
    if (body.authorizationId) {
      const auth = await prisma.authorizationToken.findUnique({ where: { id: body.authorizationId } });
      authValid =
        !!auth && auth.status === "ACTIVE" && auth.scopeVerified && auth.expiresAt > new Date();
    }

    const supervisor = runSupervisor({
      programAuthorized: true, // program exists in our authorized set
      targetInScope: scope.status === "IN_SCOPE",
      techniqueAllowed: !scope.prohibited,
      automatedTestingAllowed: program.automatedTestingAllowed,
      rateSafe: body.rateSafe,
      couldAffectOtherUsers: body.couldAffectOtherUsers,
      couldModifyOrDestroyData: body.couldModifyOrDestroyData,
      couldDisruptService: body.couldDisruptService,
      couldReadOthersData: body.couldReadOthersData,
      couldIncurCost: body.couldIncurCost,
      couldSendMessages: body.couldSendMessages,
      couldCreateManyResources: body.couldCreateManyResources,
    });

    // Decide the test status.
    let status: string = "BLOCKED";
    if (supervisor.verdict === "BLOCK") status = "BLOCKED";
    else if (supervisor.verdict === "HUMAN_APPROVAL_REQUIRED") status = "HUMAN_APPROVAL_REQUIRED";
    else if (!authValid) status = "BLOCKED"; // ALLOW but no valid token → still blocked
    else status = "AUTHORIZED";

    const test = await prisma.safeTest.create({
      data: {
        targetId: body.targetId,
        hypothesisId: body.hypothesisId,
        authorizationId: authValid ? body.authorizationId : undefined,
        title: body.title,
        plannedAction: body.plannedAction,
        potentialImpact: body.potentialImpact,
        status,
        supervisorVerdict: JSON.stringify({ supervisor, scope, authValid }),
        minimumProofOnly: true,
      },
    });

    // If human approval is required, open an Approval Gate request.
    if (status === "HUMAN_APPROVAL_REQUIRED") {
      await prisma.approval.create({
        data: {
          subjectType: "TEST",
          subjectId: test.id,
          target: target.name,
          potentialFinding: body.title,
          plannedAction: body.plannedAction,
          potentialImpact: body.potentialImpact,
          policyRule: scope.matchedRule ? `${scope.matchedRule.ruleType}:${scope.matchedRule.pattern}` : "",
          reason: supervisor.approvalReasons.join(" "),
          status: "PENDING",
        },
      });
    }

    await prisma.researchLog.create({
      data: { kind: "TEST", refId: test.id, detail: `Test "${body.title}" → ${status}`, hours: 0.25 },
    });
    await prisma.agentRun.create({
      data: {
        agent: "SecuritySupervisor",
        action: "gateTest",
        input: JSON.stringify(body),
        output: JSON.stringify({ status, supervisor, scope, authValid }),
        verdict: supervisor.verdict,
      },
    });

    return ok({ test, supervisor, scope, authValid, status }, 201);
  } catch (e) {
    return handleError(e);
  }
}
