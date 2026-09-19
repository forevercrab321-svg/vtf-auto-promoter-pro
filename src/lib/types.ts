// Shared enums and string-literal unions used across the app.
// (Stored as plain strings in SQLite; these give us type-safety in TS.)

export type ScopeStatus = "IN_SCOPE" | "OUT_OF_SCOPE" | "SCOPE_UNKNOWN";
export type SafetyState = "GREEN" | "YELLOW" | "RED";
export type Priority = "A" | "B" | "C";

export type ValidationState =
  | "POTENTIAL"
  | "CONFIRMED"
  | "LIKELY"
  | "UNCERTAIN"
  | "FALSE_POSITIVE";

export type SubmissionState =
  | "DRAFT"
  | "READY"
  | "SUBMITTED"
  | "ACCEPTED"
  | "DUPLICATE"
  | "INFORMATIVE"
  | "NA";

export type TestStatus =
  | "BLOCKED"
  | "AUTHORIZED"
  | "HUMAN_APPROVAL_REQUIRED"
  | "READY"
  | "EXECUTED"
  | "ABORTED";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "MODIFIED";

export type SupervisorVerdict = "ALLOW" | "BLOCK" | "HUMAN_APPROVAL_REQUIRED";

// The immutable core principles. No agent may override these.
export const CORE_PRINCIPLES = [
  "AUTHORIZED ONLY",
  "SCOPE FIRST",
  "MINIMUM IMPACT",
  "HUMAN CONTROL FOR SENSITIVE ACTIONS",
  "RESEARCH QUALITY > SCAN VOLUME",
  "ACCEPTED REPORTS > RAW FINDINGS",
] as const;

// Techniques that are ALWAYS prohibited, regardless of program policy.
// The Scope Guardian and Supervisor treat any match here as an automatic BLOCK.
export const ALWAYS_PROHIBITED = [
  "DoS",
  "DDoS",
  "Denial of Service",
  "Credential Stuffing",
  "Password Spraying",
  "Brute Force",
  "Social Engineering",
  "Phishing",
  "Malware",
  "Ransomware",
  "Persistence",
  "Data Destruction",
  "Data Deletion",
  "Mass User Data Exfiltration",
  "Third-party out-of-scope infrastructure",
] as const;

export const PLATFORMS = [
  "HackerOne",
  "Bugcrowd",
  "Intigriti",
  "YesWeHack",
  "Immunefi",
  "Self-hosted",
  "Other",
] as const;

export const ATTACK_SURFACE_CATEGORIES = [
  "Authentication",
  "Authorization",
  "Account Recovery",
  "Session Management",
  "API",
  "GraphQL",
  "File Upload",
  "Payments",
  "Subscription",
  "Coupons",
  "Referral",
  "Invitations",
  "Admin Functions",
  "User Roles",
  "Organization / Team",
  "Multi-Tenant",
  "Search",
  "Export",
  "Import",
  "Webhooks",
  "OAuth",
  "SSO",
  "Cloud Storage",
  "AI Features",
  "LLM Integration",
  "Prompt / Tool Permissions",
  "Business Logic",
] as const;

// Categories we prioritise for high-value, lower-duplicate research.
export const PRIORITY_CATEGORIES = [
  "Authorization",
  "IDOR / BOLA",
  "Multi-Tenant Isolation",
  "Business Logic",
  "Workflow Bypass",
  "API Authorization",
  "Privilege Boundary",
  "OAuth Misconfiguration",
  "AI Agent Permission Boundary",
] as const;
