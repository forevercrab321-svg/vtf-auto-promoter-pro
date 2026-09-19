import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, handleError } from "@/lib/api";

// Manage confirmed scope rules for a program (add / delete).
const Create = z.object({
  programId: z.string(),
  kind: z.enum(["ALLOW", "BLOCK"]),
  ruleType: z.enum(["DOMAIN", "SUBDOMAIN", "WILDCARD", "APP", "API_HOST", "METHOD", "ASSET", "TEST_ACCOUNT"]),
  pattern: z.string().min(1),
  note: z.string().default(""),
});

export async function POST(req: Request) {
  try {
    const body = Create.parse(await req.json());
    const rule = await prisma.scopeRule.create({
      data: { ...body, ruleSource: "human-confirmed" },
    });
    return ok(rule, 201);
  } catch (e) {
    return handleError(e);
  }
}

const Del = z.object({ id: z.string() });
export async function DELETE(req: Request) {
  try {
    const { id } = Del.parse(await req.json());
    await prisma.scopeRule.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
