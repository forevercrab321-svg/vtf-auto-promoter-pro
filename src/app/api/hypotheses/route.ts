import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, handleError } from "@/lib/api";

export async function GET() {
  try {
    const hypotheses = await prisma.hypothesis.findMany({
      orderBy: { createdAt: "desc" },
      include: { target: { select: { name: true, safetyState: true } } },
    });
    return ok(hypotheses);
  } catch (e) {
    return handleError(e);
  }
}

const Patch = z.object({
  id: z.string(),
  status: z.enum(["PROPOSED", "PLANNED", "TESTED", "DISCARDED"]),
});

export async function PATCH(req: Request) {
  try {
    const body = Patch.parse(await req.json());
    const h = await prisma.hypothesis.update({
      where: { id: body.id },
      data: { status: body.status },
    });
    return ok(h);
  } catch (e) {
    return handleError(e);
  }
}
