import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, handleError } from "@/lib/api";

export async function GET() {
  try {
    const approvals = await prisma.approval.findMany({ orderBy: { createdAt: "desc" } });
    return ok(approvals);
  } catch (e) {
    return handleError(e);
  }
}

const Create = z.object({
  subjectType: z.enum(["TEST", "FINDING", "ACTION"]).default("ACTION"),
  subjectId: z.string().optional(),
  target: z.string().default(""),
  potentialFinding: z.string().default(""),
  plannedAction: z.string().default(""),
  potentialImpact: z.string().default(""),
  policyRule: z.string().default(""),
  reason: z.string().default(""),
});

export async function POST(req: Request) {
  try {
    const body = Create.parse(await req.json());
    const approval = await prisma.approval.create({ data: { ...body, status: "PENDING" } });
    return ok(approval, 201);
  } catch (e) {
    return handleError(e);
  }
}
