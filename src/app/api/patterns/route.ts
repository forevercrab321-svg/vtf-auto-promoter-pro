import { ok, handleError } from "@/lib/api";
import {
  PATTERNS,
  taxonomy,
  patternsByFamily,
  patternsForSurfaces,
  searchPatterns,
  remediationFor,
} from "@/lib/knowledge";
import type { PatternFamily } from "@/lib/knowledge";

// The Security Knowledge Base, read-only. Supports:
//   /api/patterns                 → all patterns + taxonomy
//   /api/patterns?family=Authorization
//   /api/patterns?surface=API,Multi-Tenant
//   /api/patterns?q=idor
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const family = url.searchParams.get("family");
    const surface = url.searchParams.get("surface");
    const q = url.searchParams.get("q");

    let patterns = PATTERNS;
    if (family) patterns = patternsByFamily(family as PatternFamily);
    else if (surface) patterns = patternsForSurfaces(surface.split(",").map((s) => s.trim()));
    else if (q) patterns = searchPatterns(q);

    return ok({
      count: patterns.length,
      taxonomy: taxonomy(),
      patterns: patterns.map((p) => ({ ...p, remediation: remediationFor(p.id) })),
    });
  } catch (e) {
    return handleError(e);
  }
}
