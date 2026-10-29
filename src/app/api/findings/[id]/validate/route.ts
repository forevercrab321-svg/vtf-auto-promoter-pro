import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, bad, handleError, parseJsonArray } from "@/lib/api";
import { validateFinding } from "@/lib/validation";
import { duplicatePreCheck } from "@/lib/duplicate";

// Proof-required validation (Finding Validation Agent + Duplicate Risk Agent).
// Persists the computed verdict. CONFIRMED is only written when every
// proof-required criterion is met — this is the gate that keeps unvalidated
// findings out of the report → submit pipeline.
const Body = z.object({
  independentReproductions: z.number().int().min(0).default(0),
  authorizationContextValid: z.boolean().default(false),
  differentialSignal: z.boolean().default(false),
  minimumProofEvidence: z.boolean().default(false),
  environmentalNoiseRuledOut: z.boolean().default(false),
  businessImpactArticulated: z.boolean().default(false),
  falsePositiveChecklist: z
    .array(z.object({ condition: z.string(), cleared: z.boolean() }))
    .optional(),
  runDuplicateCheck: z.boolean().default(true),
  persist: z.boolean().default(true),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = Body.parse(await req.json().catch(() => ({})));
    const finding = await prisma.finding.findUnique({
      where: { id: params.id },
      include: {
        program: true,
        target: true,
        evidence: true,
        test: { include: { hypothesis: true } },
      },
    });
    if (!finding) return bad("Finding not found", 404);

    const patternId = finding.test?.hypothesis?.patternId ?? null;

    // If the caller gave no explicit evidence flag, infer from attached evidence.
    const result = validateFinding({
      independentReproductions: body.independentReproductions,
      authorizationContextValid: body.authorizationContextValid,
      differentialSignal: body.differentialSignal,
      minimumProofEvidence: body.minimumProofEvidence || finding.evidence.length > 0,
      environmentalNoiseRuledOut: body.environmentalNoiseRuledOut,
      businessImpactArticulated: body.businessImpactArticulated || finding.businessImpact.length > 0,
      patternId,
      falsePositiveChecklist: body.falsePositiveChecklist,
    });

    // Duplicate pre-check against the internal knowledge base.
    let duplicate = null;
    if (body.runDuplicateCheck) {
      const corpus = await prisma.knowledgeEntry.findMany({
        select: { title: true, body: true, tags: true, category: true },
        take: 200,
      });
      duplicate = duplicatePreCheck({
        title: finding.title,
        vulnType: finding.vulnType,
        target: finding.target?.name,
        programName: finding.program.name,
        internalCorpus: corpus.map((c) => ({
          title: c.title,
          body: c.body,
          tags: parseJsonArray(c.tags),
          category: c.category,
        })),
      });
    }

    if (body.persist) {
      await prisma.finding.update({
        where: { id: params.id },
        data: {
          validationState: result.verdict,
          reproducible: result.reproducible,
          ...(duplicate ? { duplicateRisk: duplicate.risk, duplicateNotes: duplicate.rationale } : {}),
        },
      });
      await prisma.agentRun.create({
        data: {
          agent: "FindingValidation",
          action: "proofRequiredValidate",
          input: JSON.stringify({ findingId: params.id, ...body }),
          output: JSON.stringify({ verdict: result.verdict, unmet: result.unmet }),
          verdict: result.verdict === "CONFIRMED" ? "ALLOW" : "INFO",
        },
      });
    }

    return ok({ validation: result, duplicate });
  } catch (e) {
    return handleError(e);
  }
}
