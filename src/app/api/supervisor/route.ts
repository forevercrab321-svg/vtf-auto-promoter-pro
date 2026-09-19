import { z } from "zod";
import { ok, handleError } from "@/lib/api";
import { runSupervisor, summarizeVerdict } from "@/lib/supervisor";

// Standalone Security Supervisor gate — used by the UI to preview a verdict.
const Body = z.object({
  programAuthorized: z.boolean(),
  targetInScope: z.boolean(),
  techniqueAllowed: z.boolean(),
  automatedTestingAllowed: z.boolean().default(false),
  rateSafe: z.boolean().default(true),
  couldAffectOtherUsers: z.boolean().default(false),
  couldModifyOrDestroyData: z.boolean().default(false),
  couldDisruptService: z.boolean().default(false),
  couldReadOthersData: z.boolean().default(false),
  couldIncurCost: z.boolean().default(false),
  couldSendMessages: z.boolean().default(false),
  couldCreateManyResources: z.boolean().default(false),
  policyUnclear: z.boolean().default(false),
  needsScopeExpansionToProve: z.boolean().default(false),
});

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());
    const result = runSupervisor(body);
    return ok({ ...result, summary: summarizeVerdict(result) });
  } catch (e) {
    return handleError(e);
  }
}
