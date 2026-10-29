// ============================================================================
// PRACTICE LAB fixture (opt-in):  npm run db:seed:lab
//
// Adds a self-contained practice program to BountyOS pointing at a LOCAL,
// self-hosted OWASP Juice Shop instance (http://localhost:3000) — the official
// deliberately-vulnerable training app, designed to be tested legally.
//
// This is a product test fixture: it exercises the BountyOS pipeline end-to-end
// (Scope Guardian → attack-surface map → pattern-derived hypotheses) so you can
// walk the human-in-the-loop workflow on your own machine and measure the
// system against a known answer key (Juice Shop's Score Board).
//
// It does NOT attack anything. It only writes local database records and runs
// our existing library code. You run the lab locally and do the testing.
// ============================================================================

import { PrismaClient } from "@prisma/client";
import { scoreProgram, scoreTarget } from "../src/lib/opportunity";
import { checkScope, type ScopeRuleInput } from "../src/lib/scope-guardian";
import { baselineSurface } from "../src/lib/attack-surface";
import { hypothesesFromPatterns } from "../src/lib/hypotheses";

const prisma = new PrismaClient();

const LAB_NAME = "OWASP Juice Shop (local practice lab)";

async function main() {
  // Idempotent: remove any previous copy of this lab program.
  const existing = await prisma.program.findFirst({ where: { name: LAB_NAME } });
  if (existing) {
    await prisma.program.delete({ where: { id: existing.id } });
  }

  const score = scoreProgram({
    minBounty: 0,
    maxBounty: 0,
    bountyAvailable: false,
    wildcardScope: false,
    scopeSize: 1,
    apiAvailable: true,
    mobileAvailable: false,
    sourceCodeAvailable: true, // Juice Shop is open source — white-box practice
    publicProgram: false,
    safeHarbor: true,
    automatedTestingAllowed: true, // it's YOUR local instance
  });

  const program = await prisma.program.create({
    data: {
      name: LAB_NAME,
      platform: "Practice Lab",
      programUrl: "http://localhost:3000",
      programType: "VDP",
      publicProgram: false,
      bountyAvailable: false,
      scopeSize: 1,
      apiAvailable: true,
      sourceCodeAvailable: true,
      automatedTestingAllowed: true,
      safeHarbor: true,
      prohibitedTesting: JSON.stringify(["DoS", "testing any host other than your own localhost instance"]),
      policyText:
        "Local practice only. In scope: http://localhost:3000 (your own OWASP Juice Shop instance). " +
        "Out of scope: every other host. This is a training lab you run locally; do not point it at any site you do not control.",
      notes:
        "Run the lab locally first: `docker run --rm -p 3000:3000 bkimminich/juice-shop` " +
        "(or see https://owasp.org/www-project-juice-shop/). Juice Shop ships a Score Board that marks each " +
        "solved challenge — use it as the answer key to measure the BountyOS pipeline's hit rate and false positives.",
      opportunityScore: score.score,
      priority: score.priority,
      intelligence: JSON.stringify(score),
    },
  });

  // Scope: ONLY your local instance. Everything else is out of scope.
  const rules: ScopeRuleInput[] = [
    { kind: "ALLOW", ruleType: "DOMAIN", pattern: "localhost" },
    { kind: "ALLOW", ruleType: "DOMAIN", pattern: "127.0.0.1" },
  ];
  await prisma.scopeRule.createMany({
    data: rules.map((r) => ({ programId: program.id, ...r, ruleSource: "practice-lab (local only)" })),
  });

  const decision = checkScope({ target: "localhost", rules });
  const target = await prisma.target.create({
    data: {
      programId: program.id,
      name: "Juice Shop (local)",
      url: "http://localhost:3000",
      targetType: "web",
      scopeStatus: decision.status,
      safetyState: decision.safetyState,
      scopeReason: decision.reason,
      techStack: JSON.stringify(["Node.js", "Express", "Angular", "REST API", "SQLite"]),
    },
  });

  // Map attack surface and derive hypotheses from the EXISTING pattern library.
  const surfaces = baselineSurface({ hasApi: true, hasOrgs: false, hasAi: false, hasPayments: true });
  await prisma.attackSurfaceItem.createMany({
    data: surfaces.map((s) => ({
      targetId: target.id,
      category: s.category,
      component: s.component,
      priority: s.priority,
      rationale: s.rationale,
    })),
  });
  const derived = hypothesesFromPatterns(surfaces.map((s) => s.category));
  await prisma.hypothesis.createMany({
    data: derived.map((t) => ({
      targetId: target.id,
      title: t.title,
      category: t.category,
      patternId: t.patternId,
      precondition: t.precondition,
      expectedSecureBehavior: t.expectedSecureBehavior,
      testStrategy: t.testStrategy,
      riskLevel: t.riskLevel,
      humanApprovalRequired: t.humanApprovalRequired,
      potentialImpact: t.potentialImpact,
      status: "PROPOSED",
    })),
  });
  const highValue = surfaces.filter((s) => s.priority === "HIGH").length;
  const ps = scoreTarget({ scopeStatus: decision.status, highValueSurfaces: highValue, totalSurfaces: surfaces.length, hasApi: true });
  await prisma.target.update({ where: { id: target.id }, data: { priority: ps.priority, priorityScore: ps.score } });

  console.log("Practice lab added:", {
    program: program.name,
    scope: decision.status,
    target: target.name,
    surfaces: surfaces.length,
    hypotheses: derived.length,
    priority: ps.priority,
  });
  console.log("Next: run Juice Shop locally (http://localhost:3000), then open the Targets page and walk the pipeline.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
