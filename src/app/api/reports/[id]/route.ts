import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, handleError } from "@/lib/api";

const Patch = z.object({
  markdown: z.string().optional(),
  status: z.enum(["DRAFT", "HUMAN_REVIEW", "READY_TO_SUBMIT", "SUBMITTED"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = Patch.parse(await req.json());
    const report = await prisma.report.update({ where: { id: params.id }, data: { ...body } });
    return ok(report);
  } catch (e) {
    return handleError(e);
  }
}
