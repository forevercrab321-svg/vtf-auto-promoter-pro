import { ok, handleError } from "@/lib/api";
import { buildBrief } from "@/lib/brief";

export async function GET() {
  try {
    return ok(await buildBrief());
  } catch (e) {
    return handleError(e);
  }
}
