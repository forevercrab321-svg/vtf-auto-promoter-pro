// ============================================================================
// REPORT WRITER  — produce a professional, non-exaggerated bug bounty report.
// Deterministic template first; optional LLM polish that must preserve the
// structure and never inflate impact.
// ============================================================================

import { complete, llmConfigured } from "./llm";
import { redact } from "./redact";

export interface ReportInput {
  vulnType: string;
  attackerRole: string; // e.g. "an authenticated low-privilege user"
  impactPhrase: string; // e.g. "read another tenant's records"
  asset: string;
  summary: string;
  prerequisites: string;
  steps: string[]; // reproduction steps
  expectedBehavior: string;
  actualBehavior: string;
  whoIsAffected: string;
  maxReasonableImpact: string;
  proof: string; // minimal proof (redacted)
  remediation: string;
  references?: string[]; // e.g. "OWASP API Security Top 10 · API1:2023 — https://…"
}

/** Deterministic Markdown report following the required structure. */
export function buildReportMarkdown(input: ReportInput): string {
  const title = `${input.vulnType} allows ${input.attackerRole} to ${input.impactPhrase}`;
  const steps = input.steps.length
    ? input.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")
    : "1. (Add clear, numbered reproduction steps.)";

  return `# ${title}

## Summary
${input.summary || "(Concise explanation of the vulnerability.)"}

## Asset
${input.asset || "(Affected asset / endpoint.)"}

## Prerequisites
${input.prerequisites || "(Accounts / conditions needed to reproduce, e.g. two self-owned test accounts.)"}

## Steps to Reproduce
${steps}

## Expected Behavior
${input.expectedBehavior || "(What a secure system should do.)"}

## Actual Behavior
${input.actualBehavior || "(What actually happens.)"}

## Security Impact
- **Attacker requires:** ${input.attackerRole}
- **Attacker gains:** ${input.impactPhrase}
- **Who is affected:** ${input.whoIsAffected || "(scope of affected users/tenants)"}
- **Maximum reasonable impact:** ${input.maxReasonableImpact || "(realistic worst case — do not exaggerate)"}

## Proof
${redact(input.proof) || "(Minimum necessary evidence. Secrets/PII redacted.)"}

## Remediation
${input.remediation || "(Concrete, actionable fix direction for the engineering team.)"}
${
  input.references && input.references.length
    ? `\n## References\n${input.references.map((r) => `- ${r}`).join("\n")}\n`
    : ""
}
---
_Drafted by BountyOS. Human review required before submission. Verify every claim; keep impact accurate._
`;
}

/**
 * Optionally polish wording with an LLM while preserving structure.
 * Falls back to the deterministic template if no provider is configured.
 */
export async function draftReport(input: ReportInput): Promise<string> {
  const base = buildReportMarkdown(input);
  if (!llmConfigured()) return base;

  const system =
    "You are a precise bug bounty report editor. Improve clarity and professionalism ONLY. " +
    "Never exaggerate impact. Preserve every section heading exactly. Keep redactions ([REDACTED:*]) intact. " +
    "Do not invent facts, steps, or impact not present in the draft.";
  const polished = await complete(system, `Polish this report, preserving all headings:\n\n${base}`, {
    maxTokens: 1500,
  });
  return polished || base;
}
