import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, bad, handleError } from "@/lib/api";
import { redact } from "@/lib/redact";

// Evidence Agent — always stores REDACTED request/response data (minimum proof).
const Create = z.object({
  findingId: z.string(),
  label: z.string().min(1),
  accountContext: z.string().default(""),
  requestData: z.string().default(""),
  responseData: z.string().default(""),
  expectedResult: z.string().default(""),
  actualResult: z.string().default(""),
});

export async function POST(req: Request) {
  try {
    const body = Create.parse(await req.json());
    const finding = await prisma.finding.findUnique({ where: { id: body.findingId } });
    if (!finding) return bad("Finding not found", 404);

    const evidence = await prisma.evidence.create({
      data: {
        findingId: body.findingId,
        label: body.label,
        accountContext: redact(body.accountContext),
        requestData: redact(body.requestData),
        responseData: redact(body.responseData),
        expectedResult: redact(body.expectedResult),
        actualResult: redact(body.actualResult),
        redacted: true,
      },
    });
    return ok(evidence, 201);
  } catch (e) {
    return handleError(e);
  }
}
