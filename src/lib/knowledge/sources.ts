// ============================================================================
// AUTHORITATIVE SOURCE REGISTRY
//
// Every pattern in this knowledge base cites one or more of these. All are
// public and freely available — nothing here is derived from a paywalled or
// copyrighted book. That keeps the library legally clean to ship, citable in
// reports, and (importantly) updatable: these sources keep moving.
//
// Reference IDs were verified against the live sources on 2026-09-19.
// ============================================================================

export interface SourceDef {
  key: string;
  name: string;
  url: string;
  /** Builds a deep link for a ref like "CWE-639" or "API1:2023". */
  refUrl?: (ref: string) => string;
  note: string;
}

export const SOURCES: Record<string, SourceDef> = {
  OWASP_API_2023: {
    key: "OWASP_API_2023",
    name: "OWASP API Security Top 10 (2023)",
    url: "https://owasp.org/API-Security/editions/2023/en/0x00-toc/",
    note:
      "The origin of the BOLA / BFLA / BOPLA terminology. Authoritative for API authorization classes.",
  },
  OWASP_TOP10_2021: {
    key: "OWASP_TOP10_2021",
    name: "OWASP Top 10 (2021)",
    url: "https://owasp.org/Top10/",
    note: "Web application risk categories, e.g. A01 Broken Access Control, A10 SSRF.",
  },
  OWASP_WSTG: {
    key: "OWASP_WSTG",
    name: "OWASP Web Security Testing Guide",
    url: "https://owasp.org/www-project-web-security-testing-guide/",
    note:
      "Per-class testing methodology. WSTG test IDs (e.g. WSTG-ATHZ-04) name the standard procedure.",
  },
  OWASP_ASVS: {
    key: "OWASP_ASVS",
    name: "OWASP Application Security Verification Standard",
    url: "https://owasp.org/www-project-application-security-verification-standard/",
    note:
      "Defines the EXPECTED secure behavior — the other half of a hypothesis. Useful for 'what should happen'.",
  },
  CWE: {
    key: "CWE",
    name: "MITRE CWE",
    url: "https://cwe.mitre.org/",
    refUrl: (ref) => `https://cwe.mitre.org/data/definitions/${ref.replace(/^CWE-/i, "")}.html`,
    note: "Root-cause taxonomy. Cite a CWE in reports so engineers can classify the fix.",
  },
  PORTSWIGGER: {
    key: "PORTSWIGGER",
    name: "PortSwigger Web Security Academy",
    url: "https://portswigger.net/web-security",
    note:
      "Free labs and write-ups per class. Best source for safely reproducing a class before testing a live target.",
  },
  HACKTIVITY: {
    key: "HACKTIVITY",
    name: "HackerOne Hacktivity (publicly disclosed reports)",
    url: "https://hackerone.com/hacktivity",
    note:
      "Thousands of real, publicly disclosed reports — the living, legal source for reasoning patterns and duplicate checks.",
  },
  CVD_GOOGLE_BUGHUNTERS: {
    key: "CVD_GOOGLE_BUGHUNTERS",
    name: "Google Bug Hunters — Learn",
    url: "https://bughunters.google.com/learn",
    note: "Vendor-published guidance on valid vs invalid findings and impact framing.",
  },
};

/** Resolve a citation to a URL, preferring an explicit one. */
export function citationUrl(source: string, ref?: string, url?: string): string {
  if (url) return url;
  const def = SOURCES[source];
  if (!def) return "";
  if (ref && def.refUrl) return def.refUrl(ref);
  return def.url;
}

/** Human-readable label, e.g. "MITRE CWE · CWE-639". */
export function citationLabel(source: string, ref?: string): string {
  const def = SOURCES[source];
  const name = def ? def.name : source;
  return ref ? `${name} · ${ref}` : name;
}
