// ============================================================================
// EVIDENCE REDACTION  — strip secrets & PII before anything is stored.
// Minimum-proof principle: never keep more than is needed to prove the bug.
// ============================================================================

const PATTERNS: { name: string; re: RegExp }[] = [
  // Authorization / bearer tokens
  { name: "AUTH", re: /(authorization"?\s*[:=]\s*"?)(bearer\s+)?[a-z0-9._~+/=-]{8,}/gi },
  { name: "BEARER", re: /bearer\s+[a-z0-9._~+/=-]{8,}/gi },
  // Cookies / session
  { name: "COOKIE", re: /(cookie"?\s*[:=]\s*)[^\n\r"]{6,}/gi },
  { name: "SETCOOKIE", re: /(set-cookie"?\s*[:=]\s*)[^\n\r"]{6,}/gi },
  { name: "SESSION", re: /(session[_-]?id"?\s*[:=]\s*"?)[a-z0-9._-]{6,}/gi },
  // Passwords / secrets / api keys
  { name: "PASSWORD", re: /(password"?\s*[:=]\s*"?)[^\s"&]{3,}/gi },
  { name: "APIKEY", re: /(api[_-]?key"?\s*[:=]\s*"?)[a-z0-9._-]{8,}/gi },
  { name: "SECRET", re: /(secret"?\s*[:=]\s*"?)[a-z0-9._-]{6,}/gi },
  { name: "TOKEN", re: /(token"?\s*[:=]\s*"?)[a-z0-9._-]{8,}/gi },
  // JWT
  { name: "JWT", re: /eyJ[a-z0-9_-]{5,}\.[a-z0-9_-]{5,}\.[a-z0-9_-]{5,}/gi },
  // Emails and long digit runs (potential PII / card / phone)
  { name: "EMAIL", re: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi },
  { name: "DIGITS", re: /\b\d{9,}\b/g },
];

/** Replace secret/PII-looking substrings with a redaction marker. */
export function redact(input: string): string {
  if (!input) return "";
  let out = input;
  for (const { name, re } of PATTERNS) {
    out = out.replace(re, (match, prefix) => {
      if (typeof prefix === "string" && /[:="]\s*$|=$/.test(prefix)) {
        return `${prefix}[REDACTED:${name}]`;
      }
      return `[REDACTED:${name}]`;
    });
  }
  return out;
}

/** Redact a request/response evidence object in place-safe manner. */
export function redactEvidence<T extends Record<string, unknown>>(ev: T): T {
  const clone: Record<string, unknown> = { ...ev };
  for (const key of ["requestData", "responseData", "actualResult", "expectedResult"]) {
    if (typeof clone[key] === "string") {
      clone[key] = redact(clone[key] as string);
    }
  }
  return clone as T;
}
