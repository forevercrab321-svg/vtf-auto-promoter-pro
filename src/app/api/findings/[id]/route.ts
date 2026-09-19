import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, bad, handleError } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const finding = await prisma.finding.findUnique({
      where: { id: params.id },
      include: {
        program: true,
        target: true,
        evidence: true,
        reports: true,
      },
    });
    if (!finding) return bad("Finding not found", 404);
    return ok(finding);
  } catch (e) {
    return handleError(e);
  }
}

// Validation Agent + Duplicate Risk Agent + submission tracking all update here.
const Patch = z.object({
  validationState: z.enum(["POTENTIAL", "CONFIRMED", "LIKELY", "UNCERTAIN", "FALSE_POSITIVE"]).optional(),
  reproducible: z.boolean().optional(),
  businessImpact: z.string().optional(),
  duplicateRisk: z.enum(["LOW", "MEDIUM", "HIGH", "UNKNOWN"]).optional(),
  duplicateNotes: z.string().optional(),
  submissionState: z.enum(["DRAFT", "READY", "SUBMITTED", "ACCEPTED", "DUPLICATE", "INFORMATIVE", "NA"]).optional(),
  bountyAmount: z.number().int().nullable().optional(),
  severity: z.enum(["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = Patch.parse(await req.json());
    const existing = await prisma.finding.findUnique({ where: { id: params.id } });
    if (!existing) return bad("Finding not found", 404);

    // Guard: only CONFIRMED findings may advance to READY/SUBMITTED.
    if (
      body.submissionState &&
      ["READY", "SUBMITTED"].includes(body.submissionState) &&
      (body.validationState ?? existing.validationState) !== "CONFIRMED"
    ) {
      return bad("Only CONFIRMED findings can be marked READY or SUBMITTED. Validate first.", 409);
    }

    const finding = await prisma.finding.update({
      where: { id: params.id },
      data: { ...body },
    });

    if (body.submissionState === "SUBMITTED" || body.submissionState === "ACCEPTED") {
      await prisma.researchLog.create({
        data: { kind: "SUBMISSION", refId: finding.id, detail: `${finding.title} → ${body.submissionState}`, hours: 0 },
      });
    }
    return ok(finding);
  } catch (e) {
    return handleError(e);
  }
}
