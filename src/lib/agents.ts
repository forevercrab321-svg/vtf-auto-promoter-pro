// ============================================================================
// AGENT REGISTRY  — the 15-agent research team, orchestrated by the Security
// Supervisor. This module is the single source of truth for agent identity,
// responsibilities, and the pipeline order shown across the UI.
// ============================================================================

export interface AgentDef {
  id: string;
  code: string; // "01".."15"
  name: string;
  role: string;
  deterministic: boolean; // true = rule engine, no LLM guessing allowed
  gatekeeper?: boolean; // Supervisor / Scope Guardian
}

export const AGENTS: AgentDef[] = [
  { id: "scout", code: "01", name: "Program Scout", role: "Collects public, authorized programs from official feeds/APIs and manual import. Never bypasses logins, captchas, or platform limits.", deterministic: false },
  { id: "intel", code: "02", name: "Program Intelligence", role: "Scores research value (Expected Research Value), not just max bounty. Weighs surface, competition, duplicate density.", deterministic: true },
  { id: "scope", code: "03", name: "Scope Guardian", role: "Converts policy to machine-readable scope; verifies IN/OUT/UNKNOWN; issues Authorization Tokens. The most important agent.", deterministic: true, gatekeeper: true },
  { id: "mapper", code: "04", name: "Asset Mapper", role: "Passive recon only on in-scope assets: public docs, JS endpoints, robots/sitemap, auth & role structure. No aggressive scanning.", deterministic: false },
  { id: "surface", code: "05", name: "Attack Surface Analyst", role: "Categorizes the asset graph and prioritises Authorization, IDOR/BOLA, multi-tenant, and business-logic surface.", deterministic: true },
  { id: "hypothesis", code: "06", name: "Vulnerability Hypothesis", role: "Generates testable security hypotheses (no blind scanning), each with preconditions and expected secure behavior.", deterministic: false },
  { id: "testing", code: "07", name: "Safe Testing", role: "Plans minimum-impact, authorized, reversible tests using self-owned accounts. Never runs without an Authorization Token.", deterministic: true },
  { id: "validation", code: "08", name: "Finding Validation", role: "Verifies reproducibility, authorization context, real impact, and false-positive likelihood before a finding is CONFIRMED.", deterministic: false },
  { id: "duplicate", code: "09", name: "Duplicate Risk", role: "Estimates duplicate risk against disclosed reports, known issues, and internal knowledge base.", deterministic: false },
  { id: "evidence", code: "10", name: "Evidence", role: "Captures minimal, redacted proof (requests/responses/screens). Auto-redacts secrets & PII.", deterministic: true },
  { id: "report", code: "11", name: "Report Writer", role: "Drafts professional, non-exaggerated reports in the standard structure.", deterministic: false },
  { id: "roi", code: "12", name: "Reward / ROI Analyst", role: "Tracks research hours, acceptance/duplicate rates, and reward-per-hour. Optimises for Expected Research Value.", deterministic: true },
  { id: "kb", code: "13", name: "Knowledge Base", role: "Persists reusable knowledge: programs, assets, auth models, finding patterns, false positives, lessons.", deterministic: true },
  { id: "supervisor", code: "14", name: "Security Supervisor", role: "Runs the 9-question safety gate before any action. BLOCKs if program/scope/technique aren't clearly authorized.", deterministic: true, gatekeeper: true },
  { id: "ops", code: "15", name: "Operations Manager", role: "Runs each research cycle, prioritises Priority-A targets, and produces the Daily Security Research Brief.", deterministic: true },
];

export function getAgent(id: string): AgentDef | undefined {
  return AGENTS.find((a) => a.id === id);
}

// The canonical research pipeline. Human review is a mandatory stage.
export const PIPELINE: { stage: string; agent: string; human?: boolean }[] = [
  { stage: "Program Discovery", agent: "Program Scout" },
  { stage: "Program Rule Parsing", agent: "Scope Guardian" },
  { stage: "Scope Verification", agent: "Scope Guardian" },
  { stage: "Target Prioritization", agent: "Program Intelligence" },
  { stage: "Passive Recon", agent: "Asset Mapper" },
  { stage: "Attack Surface Mapping", agent: "Attack Surface Analyst" },
  { stage: "Hypothesis Generation", agent: "Vulnerability Hypothesis" },
  { stage: "Safe Authorized Testing", agent: "Safe Testing" },
  { stage: "Potential Finding", agent: "Safe Testing" },
  { stage: "Validation", agent: "Finding Validation" },
  { stage: "Duplicate Check", agent: "Duplicate Risk" },
  { stage: "Evidence Package", agent: "Evidence" },
  { stage: "Report Draft", agent: "Report Writer" },
  { stage: "Human Review", agent: "You (human)", human: true },
  { stage: "Ready to Submit", agent: "Report Writer" },
  { stage: "Result Tracking", agent: "Reward / ROI Analyst" },
  { stage: "Knowledge Update", agent: "Knowledge Base" },
];
