import { ok, handleError } from "@/lib/api";
import { computeMetrics } from "@/lib/metrics";

export async function GET() {
  try {
    return ok(await computeMetrics());
  } catch (e) {
    return handleError(e);
  }
}
