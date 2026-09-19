import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, handleError } from "@/lib/api";

export async function GET() {
  try {
    const entries = await prisma.knowledgeEntry.findMany({ orderBy: { createdAt: "desc" } });
    return ok(entries);
  } catch (e) {
    return handleError(e);
  }
}

const Create = z.object({
  category: z.enum([
    "Program",
    "Asset",
    "Technology",
    "AuthModel",
    "FindingPattern",
    "FalsePositive",
    "Duplicate",
    "Lesson",
  ]),
  title: z.string().min(1),
  body: z.string().default(""),
  tags: z.array(z.string()).default([]),
  programRef: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = Create.parse(await req.json());
    const entry = await prisma.knowledgeEntry.create({
      data: { ...body, tags: JSON.stringify(body.tags) },
    });
    return ok(entry, 201);
  } catch (e) {
    return handleError(e);
  }
}
