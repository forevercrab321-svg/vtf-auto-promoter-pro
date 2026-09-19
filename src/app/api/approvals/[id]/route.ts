import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, bad, handleError } from "@/lib/api";

// Human Approval Gate decision. Approving a TEST advances it to READY;
// rejecting aborts it. Only a human should call this endpoint.
const Decide = z.object({
  status: z.enum(["APPROVED", "REJECTED", "MODIFIED"]),
  decidedBy: z.string().default("human"),
  decisionNote: z.string().default(""),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = Decide.parse(await req.json());
    const approval = await prisma.approval.findUnique({ where: { id: params.id } });
    if (!approval) return bad("Approval not found", 404);

    const updated = await prisma.approval.update({
      where: { id: params.id },
      data: {
        status: body.status,
        decidedBy: body.decidedBy,
        decisionNote: body.decisionNote,
        decidedAt: new Date(),
      },
    });

    if (approval.subjectType === "TEST" && approval.subjectId) {
      const newStatus =
        body.status === "APPROVED" ? "READY" : body.status === "REJECTED" ? "ABORTED" : "HUMAN_APPROVAL_REQUIRED";
      await prisma.safeTest.update({
        where: { id: approval.subjectId },
        data: { status: newStatus },
      });
    }

    await prisma.agentRun.create({
      data: {
        agent: "HumanApprovalGate",
        action: "decide",
        input: JSON.stringify({ approvalId: params.id }),
        output: JSON.stringify(body),
        verdict: body.status === "APPROVED" ? "ALLOW" : "BLOCK",
      },
    });

    return ok(updated);
  } catch (e) {
    return handleError(e);
  }
}
