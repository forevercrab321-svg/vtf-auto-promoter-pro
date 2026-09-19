import type { VulnPattern, PatternRemediation } from "./types";

// ============================================================================
// FAMILY: Server Side
// SSRF · XXE · SSTI · File handling · Injection (SQLi)
//
// NOTE: These classes can have real impact on a target. Every `test` here is
// framed as the MINIMUM, non-destructive proof (e.g. an out-of-band callback to
// a researcher-controlled host, or a single benign marker) and most carry
// requiresHumanApproval=true. Escalation beyond proof-of-concept is out of scope
// for automated planning.
// ============================================================================

export const SERVER_SIDE_PATTERNS: VulnPattern[] = [
  {
    id: "ss-ssrf",
    family: "ServerSide",
    subfamily: "SSRF",
    title: "Server-Side Request Forgery via user-supplied URL",
    vulnerabilityPattern:
      "The server fetches a URL supplied or influenced by the client (webhook, image import, link preview, PDF render) without restricting the destination.",
    applicationContext: "Webhook config, URL preview/unfurl, import-from-URL, and avatar/image fetchers.",
    precondition: "A feature that takes a URL and causes the server to make a request.",
    observation:
      "A URL field triggers a server-side fetch; responses or timing differ for internal vs external hosts.",
    researchHypothesis: "Can the server be induced to request an arbitrary destination the client controls?",
    securityBoundary: "Server-initiated requests are restricted to an allowlist; internal ranges are blocked.",
    test:
      "Point the feature at a researcher-controlled external host (e.g. your own listener) and confirm the callback — that alone proves SSRF. Do NOT target internal/metadata addresses or pivot; stop at the out-of-band proof.",
    unexpectedBehavior: "Your external listener receives a request from the target's server.",
    rootCause: "No destination allowlist / no blocking of internal address ranges.",
    exploitCondition: "The fetch reaches attacker-chosen destinations.",
    impact:
      "At minimum, blind server-side requests; potential internal access — but proof stops at the OOB callback. Do not enumerate internal services.",
    falsePositiveConditions: [
      "A client-side (browser) fetch, not server-side.",
      "The callback originates from a sanctioned proxy/CDN, not the app server.",
      "A pre-fetch validator rejects the destination and the 'hit' is your own retry.",
    ],
    detectionHeuristic: "Any feature that fetches a URL → test with a unique OOB canary you control.",
    severityBand: "HIGH",
    duplicateDensity: "MEDIUM",
    surfaceCategories: ["API", "Webhooks", "File Upload", "Cloud Storage"],
    requiresHumanApproval: true,
    citations: [
      { source: "OWASP_TOP10_2021", ref: "A10:2021" },
      { source: "OWASP_API_2023", ref: "API7:2023" },
      { source: "CWE", ref: "CWE-918" },
      { source: "PORTSWIGGER", url: "https://portswigger.net/web-security/ssrf" },
    ],
  },
  {
    id: "ss-xxe",
    family: "ServerSide",
    subfamily: "XXE",
    title: "XML External Entity processing",
    vulnerabilityPattern:
      "An XML parser processes external entities from client-supplied XML, enabling file read, SSRF, or DoS.",
    applicationContext: "SOAP endpoints, SAML, document/office-file import, and any XML body handler.",
    precondition: "An endpoint that accepts and parses XML (or a format that wraps XML).",
    observation: "XML input is accepted; the parser's entity handling is unknown.",
    researchHypothesis: "Does the parser resolve external entities defined in client XML?",
    securityBoundary: "External entity and DTD processing is disabled in the parser.",
    test:
      "Submit XML with a benign external entity pointing to a researcher-controlled OOB host; a callback proves resolution. Do NOT attempt to read sensitive files or trigger entity-expansion DoS.",
    unexpectedBehavior: "Your OOB host receives a request, proving external-entity resolution.",
    rootCause: "XML parser configured to resolve external entities / DTDs.",
    exploitCondition: "Client XML reaches a permissive parser.",
    impact: "Proof-level: external entity resolution. Escalation (file read/SSRF/DoS) is out of automated scope.",
    falsePositiveConditions: [
      "The parser rejects the DTD but the endpoint still 200s on the rest.",
      "A generic XML error mistaken for entity processing.",
    ],
    detectionHeuristic: "For XML inputs, send a benign OOB entity; watch for a callback.",
    severityBand: "HIGH",
    duplicateDensity: "MEDIUM",
    surfaceCategories: ["API", "Import", "File Upload"],
    requiresHumanApproval: true,
    citations: [
      { source: "OWASP_WSTG", ref: "WSTG-INPV-07" },
      { source: "CWE", ref: "CWE-611" },
      { source: "PORTSWIGGER", url: "https://portswigger.net/web-security/xxe" },
    ],
  },
  {
    id: "ss-ssti",
    family: "ServerSide",
    subfamily: "SSTI",
    title: "Server-Side Template Injection",
    vulnerabilityPattern:
      "User input is embedded into a server-side template that is then evaluated, letting template expressions execute.",
    applicationContext: "Customizable emails, PDF/report generators, and CMS features using Jinja2/Twig/Freemarker/etc.",
    precondition: "An input that ends up rendered by a server-side template engine.",
    observation: "Input reflected into generated output; a template-syntax probe changes the output.",
    researchHypothesis: "Is client input evaluated as a template expression rather than treated as data?",
    securityBoundary: "User input is treated as data; template expressions in input are not evaluated.",
    test:
      "Submit a minimal arithmetic probe appropriate to the suspected engine (e.g. a value that would render as a computed number only if evaluated). A single evaluated probe proves SSTI. Do NOT chain to code execution or file/system access.",
    unexpectedBehavior: "The arithmetic probe renders as its computed result, proving evaluation.",
    rootCause: "Concatenating user input into a template string instead of passing it as bound data.",
    exploitCondition: "Input reaches the template compilation stage.",
    impact: "Proof-level: expression evaluation; full SSTI can reach RCE — escalation is out of automated scope.",
    falsePositiveConditions: [
      "Output coincidentally matches the probe without evaluation.",
      "A client-side template, not server-side.",
      "The engine sandboxes expressions so the probe is inert.",
    ],
    detectionHeuristic: "Reflected input → send an engine-appropriate arithmetic probe; evaluation = SSTI.",
    severityBand: "HIGH",
    duplicateDensity: "LOW",
    surfaceCategories: ["API", "Export", "Business Logic"],
    requiresHumanApproval: true,
    citations: [
      { source: "CWE", ref: "CWE-1336" },
      { source: "PORTSWIGGER", url: "https://portswigger.net/web-security/server-side-template-injection" },
      { source: "OWASP_WSTG", ref: "WSTG-INPV-18" },
    ],
  },
  {
    id: "ss-file-handling",
    family: "ServerSide",
    subfamily: "File handling",
    title: "Unsafe file upload / path handling",
    vulnerabilityPattern:
      "Uploaded files are stored/served without validating type, or a path parameter permits traversal, enabling dangerous file placement or read.",
    applicationContext: "Avatar/document upload, import features, and any file-path parameter.",
    precondition: "A self-owned account that can upload a file or supply a file path.",
    observation:
      "Upload accepts arbitrary extensions/content types, or a filename/path parameter reflects into the storage path.",
    researchHypothesis:
      "Can a file be stored with a dangerous type/location, or can a path parameter escape its directory?",
    securityBoundary: "Uploads are type/size validated and stored outside webroot; paths are canonicalized and confined.",
    test:
      "Upload a single benign marker file with an unexpected extension to your OWN account and check how it is stored/served; for paths, test one traversal marker (e.g. a harmless sentinel filename). Do NOT upload webshells or read system files.",
    unexpectedBehavior: "A disallowed file type is stored/served executable, or a path escapes its intended directory.",
    rootCause: "Missing content/type validation or non-canonicalized path handling.",
    exploitCondition: "Stored file is reachable/executed, or the path parameter is honored.",
    impact: "Proof-level: unsafe storage/traversal; escalation (RCE/arbitrary read) is out of automated scope.",
    falsePositiveConditions: [
      "The file is stored but served with a safe content-type and never executed.",
      "Traversal markers are normalized away server-side.",
    ],
    detectionHeuristic: "Test upload type enforcement and any filename/path parameter with a benign sentinel.",
    severityBand: "MEDIUM",
    duplicateDensity: "MEDIUM",
    surfaceCategories: ["File Upload", "Import", "API"],
    requiresHumanApproval: true,
    citations: [
      { source: "OWASP_WSTG", ref: "WSTG-BUSL-09" },
      { source: "CWE", ref: "CWE-434" },
      { source: "PORTSWIGGER", url: "https://portswigger.net/web-security/file-upload" },
    ],
  },
  {
    id: "ss-sqli",
    family: "ServerSide",
    subfamily: "Injection",
    title: "SQL Injection",
    vulnerabilityPattern:
      "User input is concatenated into a SQL query, letting input alter the query's structure.",
    applicationContext: "Search, filter, and report endpoints that build SQL from parameters.",
    precondition: "A parameter that appears to feed a database query.",
    observation:
      "Injecting a single quote / boolean condition changes results or errors in a query-consistent way.",
    researchHypothesis: "Does client input change the SQL query's logic rather than being bound as a value?",
    securityBoundary: "All queries use parameterized statements; input is never concatenated into SQL.",
    test:
      "Send one benign, non-destructive probe (e.g. a boolean-true vs boolean-false pair, or a single quote) and compare responses. Confirm with a differential read-only signal. Do NOT run stacked queries, extract data at volume, or use time-based payloads that load the DB. UNION/error probes only if a single benign marker is insufficient — and never DROP/DELETE/UPDATE.",
    unexpectedBehavior: "Response differs between logically true/false injections, indicating query control.",
    rootCause: "String-concatenated SQL instead of parameterized queries.",
    exploitCondition: "Input reaches the SQL builder unparameterized.",
    impact:
      "Proof-level: query manipulation. Do not exfiltrate real data; a differential signal is sufficient proof for a report.",
    falsePositiveConditions: [
      "A WAF produces the differing responses, not the DB.",
      "Input is reflected but bound (parameterized) — differences are coincidental.",
      "Client-side filtering causes the apparent change.",
    ],
    detectionHeuristic: "Boolean-differential probe on query params; confirm the difference is query-driven.",
    severityBand: "CRITICAL",
    duplicateDensity: "MEDIUM",
    surfaceCategories: ["API", "Search", "Business Logic"],
    requiresHumanApproval: true,
    citations: [
      { source: "OWASP_WSTG", ref: "WSTG-INPV-05" },
      { source: "CWE", ref: "CWE-89" },
      { source: "PORTSWIGGER", url: "https://portswigger.net/web-security/sql-injection" },
    ],
  },
];

export const SERVER_SIDE_REMEDIATIONS: PatternRemediation[] = [
  { patternId: "ss-ssrf", remediation: "Allowlist outbound destinations, resolve and re-check the final IP, and block internal/metadata ranges; fetch via a constrained egress proxy." },
  { patternId: "ss-xxe", remediation: "Disable DTD and external-entity processing in the XML parser (or use a non-XML format)." },
  { patternId: "ss-ssti", remediation: "Never build templates from user input; pass user data as bound context variables and sandbox the engine." },
  { patternId: "ss-file-handling", remediation: "Validate type/size, store outside webroot with server-generated names, and canonicalize/confine all file paths." },
  { patternId: "ss-sqli", remediation: "Use parameterized queries / prepared statements everywhere; never concatenate input into SQL." },
];
