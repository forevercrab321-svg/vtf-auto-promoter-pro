// Demo seed data for BountyOS.
// All hosts use *.example / *-demo.example so nothing points at a real program.
// This is illustrative data only — always confirm real scope before any testing.

import { PrismaClient } from "@prisma/client";
import { scoreProgram } from "../src/lib/opportunity";
import { checkScope, type ScopeRuleInput } from "../src/lib/scope-guardian";
import { baselineSurface } from "../src/lib/attack-surface";
import { hypothesesFromPatterns } from "../src/lib/hypotheses";
import { scoreTarget } from "../src/lib/opportunity";
import { redact } from "../src/lib/redact";

const prisma = new PrismaClient();

async function reset() {
  // Delete in dependency order.
  await prisma.evidence.deleteMany();
  await prisma.report.deleteMany();
  await prisma.finding.deleteMany();
  await prisma.safeTest.deleteMany();
  await prisma.hypothesis.deleteMany();
  await prisma.attackSurfaceItem.deleteMany();
  await prisma.authorizationToken.deleteMany();
  await prisma.target.deleteMany();
  await prisma.scopeRule.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.knowledgeEntry.deleteMany();
  await prisma.researchLog.deleteMany();
  await prisma.agentRun.deleteMany();
  await prisma.program.deleteMany();
}

async function main() {
  await reset();

  // -------------------------------------------------------------------------
  // Program 1 — Acme Cloud (multi-tenant SaaS, API, wildcard). Priority target.
  // -------------------------------------------------------------------------
  const acmeScore = scoreProgram({
    minBounty: 250,
    maxBounty: 15000,
    bountyAvailable: true,
    wildcardScope: true,
    scopeSize: 12,
    apiAvailable: true,
    mobileAvailable: false,
    sourceCodeAvailable: false,
    publicProgram: true,
    safeHarbor: true,
    automatedTestingAllowed: false,
  });
  const acme = await prisma.program.create({
    data: {
      name: "Acme Cloud (demo)",
      platform: "HackerOne",
      programUrl: "https://example.com/acme",
      programType: "BugBounty",
      publicProgram: true,
      bountyAvailable: true,
      minBounty: 250,
      maxBounty: 15000,
      scopeSize: 12,
      wildcardScope: true,
      assetTypes: JSON.stringify(["web", "api"]),
      apiAvailable: true,
      automatedTestingAllowed: false,
      rateLimit: "5 req/s",
      prohibitedTesting: JSON.stringify(["DoS", "Social Engineering", "Automated scanning"]),
      safeHarbor: true,
      policyText:
        "In scope:\n*.acme-demo.example\napi.acme-demo.example\n\nOut of scope:\nblog.acme-demo.example\n\nProhibited: DoS, social engineering, automated scanning.",
      opportunityScore: acmeScore.score,
      priority: acmeScore.priority,
      intelligence: JSON.stringify(acmeScore),
    },
  });

  const acmeRules: { kind: "ALLOW" | "BLOCK"; ruleType: ScopeRuleInput["ruleType"]; pattern: string }[] = [
    { kind: "ALLOW", ruleType: "WILDCARD", pattern: "*.acme-demo.example" },
    { kind: "ALLOW", ruleType: "DOMAIN", pattern: "api.acme-demo.example" },
    { kind: "BLOCK", ruleType: "DOMAIN", pattern: "blog.acme-demo.example" },
    { kind: "BLOCK", ruleType: "METHOD", pattern: "DoS" },
  ];
  await prisma.scopeRule.createMany({
    data: acmeRules.map((r) => ({ programId: acme.id, ...r, ruleSource: "human-confirmed (demo)" })),
  });

  // Targets with real Scope Guardian verdicts.
  const acmeTargets = [
    { name: "Acme API", url: "api.acme-demo.example", type: "api" },
    { name: "Acme App", url: "app.acme-demo.example", type: "web" },
    { name: "Acme Blog", url: "blog.acme-demo.example", type: "web" }, // blocked → RED
    { name: "Partner Portal", url: "portal.partner-demo.example", type: "web" }, // unknown → YELLOW
  ];
  const createdTargets = [];
  for (const t of acmeTargets) {
    const decision = checkScope({
      target: t.url,
      rules: acmeRules,
      programProhibited: ["DoS", "Social Engineering"],
    });
    const target = await prisma.target.create({
      data: {
        programId: acme.id,
        name: t.name,
        url: t.url,
        targetType: t.type,
        scopeStatus: decision.status,
        safetyState: decision.safetyState,
        scopeReason: decision.reason,
        techStack: JSON.stringify(t.type === "api" ? ["Node.js", "PostgreSQL", "REST"] : ["React", "Next.js"]),
      },
    });
    createdTargets.push(target);
  }

  const acmeApi = createdTargets[0];

  // Analyze the API target: attack surface + hypotheses (as the /analyze route does).
  const surfaces = baselineSurface({ hasApi: true, hasOrgs: true, hasGraphql: false, hasAi: false, hasPayments: false });
  await prisma.attackSurfaceItem.createMany({
    data: surfaces.map((s) => ({
      targetId: acmeApi.id,
      category: s.category,
      component: s.component,
      priority: s.priority,
      rationale: s.rationale,
    })),
  });
  const derived = hypothesesFromPatterns(surfaces.map((s) => s.category));
  await prisma.hypothesis.createMany({
    data: derived.map((t) => ({
      targetId: acmeApi.id,
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
  // Grab the IDOR hypothesis so the demo test/finding/report chain can cite it.
  const idorHypothesis = await prisma.hypothesis.findFirst({
    where: { targetId: acmeApi.id, patternId: "authz-idor" },
  });
  const highValue = surfaces.filter((s) => s.priority === "HIGH").length;
  const ps = scoreTarget({ scopeStatus: "IN_SCOPE", highValueSurfaces: highValue, totalSurfaces: surfaces.length, hasApi: true });
  await prisma.target.update({ where: { id: acmeApi.id }, data: { priority: ps.priority, priorityScore: ps.score } });

  // Authorization token for the API (scope-verified).
  const token = await prisma.authorizationToken.create({
    data: {
      programId: acme.id,
      target: "api.acme-demo.example",
      assetType: "api",
      plannedTestType: "authorization / IDOR test",
      scopeVerified: true,
      ruleSource: "DOMAIN:api.acme-demo.example",
      rateLimit: "5 req/s",
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    },
  });

  // A safe, authorized test (no sensitive flags → AUTHORIZED), linked to the
  // IDOR hypothesis so its finding/report can cite the knowledge-base pattern.
  const idorTest = await prisma.safeTest.create({
    data: {
      targetId: acmeApi.id,
      authorizationId: token.id,
      hypothesisId: idorHypothesis?.id,
      title: "IDOR check on GET /v1/objects/{id}",
      plannedAction: "As self-owned account B, request account A's object id once. Compare 200 vs 403.",
      potentialImpact: "Cross-user object read if ownership isn't enforced.",
      status: "AUTHORIZED",
      minimumProofOnly: true,
      supervisorVerdict: JSON.stringify({ verdict: "ALLOW" }),
    },
  });

  // A sensitive test that triggers Human Approval.
  const sensitiveTest = await prisma.safeTest.create({
    data: {
      targetId: acmeApi.id,
      authorizationId: token.id,
      title: "Verify tenant isolation by reading another org's record",
      plannedAction: "Confirm 403 boundary; may briefly touch another tenant's record id to prove impact.",
      potentialImpact: "Could read another tenant's data — needs human sign-off.",
      status: "HUMAN_APPROVAL_REQUIRED",
      minimumProofOnly: true,
      supervisorVerdict: JSON.stringify({ verdict: "HUMAN_APPROVAL_REQUIRED" }),
    },
  });
  await prisma.approval.create({
    data: {
      subjectType: "TEST",
      subjectId: sensitiveTest.id,
      target: "api.acme-demo.example",
      potentialFinding: "Multi-tenant isolation weakness",
      plannedAction: sensitiveTest.plannedAction,
      potentialImpact: sensitiveTest.potentialImpact,
      policyRule: "DOMAIN:api.acme-demo.example",
      reason: "Test may read other real users' / another tenant's data.",
      status: "PENDING",
    },
  });

  // A CONFIRMED finding with redacted evidence + a report.
  const finding = await prisma.finding.create({
    data: {
      programId: acme.id,
      targetId: acmeApi.id,
      testId: idorTest.id,
      title: "IDOR on GET /v1/objects/{id} exposes other users' objects",
      vulnType: "IDOR / BOLA",
      severity: "HIGH",
      summary:
        "The object read endpoint checks that the object id exists but not that the caller owns it, allowing one user to read another user's objects.",
      validationState: "CONFIRMED",
      reproducible: true,
      businessImpact: "An authenticated user can read arbitrary objects belonging to other users within the platform.",
      duplicateRisk: "LOW",
      duplicateNotes: "No matching disclosed report found; endpoint recently changed.",
      submissionState: "READY",
    },
  });
  await prisma.evidence.create({
    data: {
      findingId: finding.id,
      label: "Cross-user read (minimum proof)",
      accountContext: "Self-owned accounts A and B",
      requestData: redact("GET /v1/objects/OBJ_A HTTP/1.1\nAuthorization: Bearer eyJhbGciOi.SAMPLE.TOKEN\nCookie: session_id=abcdef123456"),
      responseData: redact('HTTP/1.1 200 OK\n{"id":"OBJ_A","owner":"userA","email":"victim@example.com"}'),
      expectedResult: "403 Forbidden (B does not own OBJ_A)",
      actualResult: "200 OK — B receives A's object",
      redacted: true,
    },
  });
  await prisma.report.create({
    data: {
      programId: acme.id,
      findingId: finding.id,
      title: "IDOR / BOLA — object read endpoint lacks ownership check",
      status: "READY_TO_SUBMIT",
      markdown:
        "# IDOR / BOLA allows an authenticated low-privilege user to read another user's objects\n\n## Summary\nThe object read endpoint validates the object id but not ownership.\n\n## Asset\napi.acme-demo.example — GET /v1/objects/{id}\n\n## Prerequisites\nTwo self-owned test accounts (A and B).\n\n## Steps to Reproduce\n1. As account A, create an object and note its id.\n2. As account B, request GET /v1/objects/{A's id}.\n3. Observe 200 OK returning A's object.\n\n## Expected Behavior\n403 Forbidden — B does not own the object.\n\n## Actual Behavior\n200 OK — B receives A's object.\n\n## Security Impact\n- Attacker requires: any authenticated account.\n- Attacker gains: read access to other users' objects.\n- Maximum reasonable impact: cross-user data exposure across the object store.\n\n## Proof\nMinimal request/response with secrets redacted.\n\n## Remediation\nEnforce an ownership/authorization check on the object before returning it.\n\n---\n_Drafted by BountyOS. Human review required before submission._",
    },
  });

  // -------------------------------------------------------------------------
  // Program 2 — Globex VDP (no bounty, safe harbor, source available).
  // -------------------------------------------------------------------------
  const globexScore = scoreProgram({
    minBounty: 0,
    maxBounty: 0,
    bountyAvailable: false,
    wildcardScope: false,
    scopeSize: 3,
    apiAvailable: true,
    mobileAvailable: false,
    sourceCodeAvailable: true,
    publicProgram: true,
    safeHarbor: true,
    automatedTestingAllowed: true,
  });
  const globex = await prisma.program.create({
    data: {
      name: "Globex VDP (demo)",
      platform: "Self-hosted",
      programType: "VDP",
      publicProgram: true,
      bountyAvailable: false,
      scopeSize: 3,
      apiAvailable: true,
      sourceCodeAvailable: true,
      automatedTestingAllowed: true,
      safeHarbor: true,
      prohibitedTesting: JSON.stringify(["DoS", "Phishing"]),
      policyText: "In scope: globex-demo.example. Prohibited: DoS, phishing.",
      opportunityScore: globexScore.score,
      priority: globexScore.priority,
      intelligence: JSON.stringify(globexScore),
    },
  });
  const globexRules = [{ kind: "ALLOW" as const, ruleType: "DOMAIN" as const, pattern: "globex-demo.example" }];
  await prisma.scopeRule.createMany({
    data: globexRules.map((r) => ({ programId: globex.id, ...r, ruleSource: "human-confirmed (demo)" })),
  });
  const gdec = checkScope({ target: "globex-demo.example", rules: globexRules });
  await prisma.target.create({
    data: {
      programId: globex.id,
      name: "Globex main site",
      url: "globex-demo.example",
      targetType: "web",
      scopeStatus: gdec.status,
      safetyState: gdec.safetyState,
      scopeReason: gdec.reason,
    },
  });

  // -------------------------------------------------------------------------
  // Program 3 — Initech Payments — an ACCEPTED finding for ROI numbers.
  // -------------------------------------------------------------------------
  const initechScore = scoreProgram({
    minBounty: 500,
    maxBounty: 8000,
    bountyAvailable: true,
    wildcardScope: false,
    scopeSize: 2,
    apiAvailable: true,
    mobileAvailable: true,
    sourceCodeAvailable: false,
    publicProgram: false,
    safeHarbor: true,
    automatedTestingAllowed: false,
  });
  const initech = await prisma.program.create({
    data: {
      name: "Initech Payments (demo)",
      platform: "Bugcrowd",
      publicProgram: false,
      bountyAvailable: true,
      minBounty: 500,
      maxBounty: 8000,
      scopeSize: 2,
      apiAvailable: true,
      mobileAvailable: true,
      safeHarbor: true,
      prohibitedTesting: JSON.stringify(["DoS", "Credential Stuffing"]),
      policyText: "In scope: pay.initech-demo.example. Prohibited: DoS, credential stuffing.",
      opportunityScore: initechScore.score,
      priority: initechScore.priority,
      intelligence: JSON.stringify(initechScore),
    },
  });
  await prisma.scopeRule.create({
    data: { programId: initech.id, kind: "ALLOW", ruleType: "DOMAIN", pattern: "pay.initech-demo.example", ruleSource: "human-confirmed (demo)" },
  });
  await prisma.finding.create({
    data: {
      programId: initech.id,
      title: "Coupon logic allows stacking beyond intended limit",
      vulnType: "Business Logic",
      severity: "MEDIUM",
      summary: "Multiple single-use coupons can be stacked on one order due to missing server-side validation.",
      validationState: "CONFIRMED",
      reproducible: true,
      businessImpact: "Revenue loss via unintended discount stacking.",
      duplicateRisk: "LOW",
      submissionState: "ACCEPTED",
      bountyAmount: 2500,
    },
  });

  // -------------------------------------------------------------------------
  // Knowledge base + research logs (for ROI hours).
  // -------------------------------------------------------------------------
  await prisma.knowledgeEntry.createMany({
    data: [
      {
        category: "FindingPattern",
        title: "Object endpoints often check ID existence, not ownership",
        body: "When mapping any REST API, test GET/PUT/DELETE on object ids from a second self-owned account. High-value, low-duplicate.",
        tags: JSON.stringify(["IDOR", "BOLA", "authorization", "api"]),
      },
      {
        category: "Lesson",
        title: "Confirm scope before touching anything",
        body: "SCOPE_UNKNOWN means stop. Never assume a related domain is in scope just because it shares a brand.",
        tags: JSON.stringify(["scope", "safety"]),
      },
      {
        category: "FalsePositive",
        title: "403 vs 404 can both indicate a correct boundary",
        body: "Some APIs return 404 to avoid leaking existence. Don't file that as a bug without an actual access.",
        tags: JSON.stringify(["false-positive"]),
      },
    ],
  });

  await prisma.researchLog.createMany({
    data: [
      { kind: "PROGRAM_REVIEWED", detail: "Reviewed Acme, Globex, Initech", hours: 1.5 },
      { kind: "TARGET_REVIEWED", detail: "Prioritized Acme API", hours: 1 },
      { kind: "HYPOTHESIS", detail: "Generated hypotheses for Acme API", hours: 1 },
      { kind: "TEST", detail: "IDOR test on Acme API", hours: 2 },
      { kind: "FINDING", detail: "Confirmed IDOR", hours: 1.5 },
      { kind: "REPORT", detail: "Drafted IDOR report", hours: 1 },
      { kind: "SUBMISSION", detail: "Coupon stacking accepted", hours: 2 },
    ],
  });

  const counts = {
    programs: await prisma.program.count(),
    targets: await prisma.target.count(),
    hypotheses: await prisma.hypothesis.count(),
    findings: await prisma.finding.count(),
    approvals: await prisma.approval.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
