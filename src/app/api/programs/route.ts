import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, handleError } from "@/lib/api";
import { parsePolicyToRules } from "@/lib/scope-guardian";
import { scoreProgram } from "@/lib/opportunity";

const CreateProgram = z.object({
  name: z.string().min(1),
  platform: z.string().default("Other"),
  programUrl: z.string().optional(),
  programType: z.enum(["BugBounty", "VDP"]).default("BugBounty"),
  publicProgram: z.boolean().default(true),
  bountyAvailable: z.boolean().default(true),
  minBounty: z.number().int().nullable().optional(),
  maxBounty: z.number().int().nullable().optional(),
  scopeSize: z.number().int().default(0),
  wildcardScope: z.boolean().default(false),
  assetTypes: z.array(z.string()).default([]),
  apiAvailable: z.boolean().default(false),
  mobileAvailable: z.boolean().default(false),
  sourceCodeAvailable: z.boolean().default(false),
  automatedTestingAllowed: z.boolean().default(false),
  rateLimit: z.string().optional(),
  prohibitedTesting: z.array(z.string()).default([]),
  safeHarbor: z.boolean().default(false),
  policyText: z.string().default(""),
  notes: z.string().default(""),
});

export async function GET() {
  try {
    const programs = await prisma.program.findMany({
      orderBy: [{ opportunityScore: "desc" }, { createdAt: "desc" }],
      include: { _count: { select: { assets: true, targets: true, findings: true, scopeRules: true } } },
    });
    return ok(programs);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const body = CreateProgram.parse(await req.json());

    const score = scoreProgram({
      minBounty: body.minBounty ?? null,
      maxBounty: body.maxBounty ?? null,
      bountyAvailable: body.bountyAvailable,
      wildcardScope: body.wildcardScope,
      scopeSize: body.scopeSize,
      apiAvailable: body.apiAvailable,
      mobileAvailable: body.mobileAvailable,
      sourceCodeAvailable: body.sourceCodeAvailable,
      publicProgram: body.publicProgram,
      safeHarbor: body.safeHarbor,
      automatedTestingAllowed: body.automatedTestingAllowed,
    });

    const program = await prisma.program.create({
      data: {
        name: body.name,
        platform: body.platform,
        programUrl: body.programUrl,
        programType: body.programType,
        publicProgram: body.publicProgram,
        bountyAvailable: body.bountyAvailable,
        minBounty: body.minBounty ?? null,
        maxBounty: body.maxBounty ?? null,
        scopeSize: body.scopeSize,
        wildcardScope: body.wildcardScope,
        assetTypes: JSON.stringify(body.assetTypes),
        apiAvailable: body.apiAvailable,
        mobileAvailable: body.mobileAvailable,
        sourceCodeAvailable: body.sourceCodeAvailable,
        automatedTestingAllowed: body.automatedTestingAllowed,
        rateLimit: body.rateLimit,
        prohibitedTesting: JSON.stringify(body.prohibitedTesting),
        safeHarbor: body.safeHarbor,
        policyText: body.policyText,
        notes: body.notes,
        opportunityScore: score.score,
        priority: score.priority,
        intelligence: JSON.stringify(score),
      },
    });

    // Scope Guardian: propose machine-readable rules from the policy text.
    const { proposed, warnings } = parsePolicyToRules(body.policyText);
    if (proposed.length) {
      await prisma.scopeRule.createMany({
        data: proposed.map((r) => ({
          programId: program.id,
          kind: r.kind,
          ruleType: r.ruleType,
          pattern: r.pattern,
          ruleSource: "auto-parsed from policy (confirm manually)",
        })),
      });
    }

    await prisma.researchLog.create({
      data: { kind: "PROGRAM_REVIEWED", refId: program.id, detail: `Added program ${program.name}`, hours: 0.25 },
    });
    await prisma.agentRun.create({
      data: {
        agent: "ScopeGuardian",
        action: "parsePolicyToRules",
        output: JSON.stringify({ proposed, warnings }),
        verdict: "INFO",
      },
    });

    return ok({ program, proposedRules: proposed, warnings }, 201);
  } catch (e) {
    return handleError(e);
  }
}
