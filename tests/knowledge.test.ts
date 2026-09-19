import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PATTERNS,
  taxonomy,
  getPattern,
  remediationFor,
  patternsForSurfaces,
  searchPatterns,
} from "../src/lib/knowledge";
import { SOURCES, citationUrl } from "../src/lib/knowledge/sources";
import { hypothesesFromPatterns } from "../src/lib/hypotheses";

test("library has the expected family counts (6/5/6/5 = 22)", () => {
  const tx = taxonomy();
  assert.equal(PATTERNS.length, 22);
  assert.equal(tx.Authorization.length, 6);
  assert.equal(tx.Authentication.length, 5);
  assert.equal(tx.BusinessLogic.length, 6);
  assert.equal(tx.ServerSide.length, 5);
});

test("every pattern is complete and well-formed", () => {
  const ids = new Set<string>();
  for (const p of PATTERNS) {
    assert.ok(!ids.has(p.id), `duplicate id ${p.id}`);
    ids.add(p.id);
    // all 13 reasoning fields present and non-trivial
    for (const f of [
      "vulnerabilityPattern",
      "applicationContext",
      "precondition",
      "observation",
      "researchHypothesis",
      "securityBoundary",
      "test",
      "unexpectedBehavior",
      "rootCause",
      "exploitCondition",
      "impact",
      "detectionHeuristic",
    ] as const) {
      assert.ok((p[f] ?? "").length >= 10, `${p.id}.${f} too short`);
    }
    assert.ok(p.falsePositiveConditions.length >= 2, `${p.id} needs >=2 false-positive conditions`);
    assert.ok(p.citations.length >= 1, `${p.id} needs a citation`);
    assert.ok(remediationFor(p.id).length >= 10, `${p.id} needs a remediation`);
  }
});

test("every citation resolves to a known source and a URL", () => {
  for (const p of PATTERNS) {
    for (const c of p.citations) {
      assert.ok(SOURCES[c.source] || c.url, `${p.id} cites unknown source ${c.source}`);
      assert.ok(citationUrl(c.source, c.ref, c.url).startsWith("http"), `${p.id} citation has no URL`);
    }
  }
});

test("surface lookup and search work", () => {
  const mt = patternsForSurfaces(["Multi-Tenant"]).map((p) => p.id);
  assert.ok(mt.includes("authz-multitenant"));
  assert.ok(searchPatterns("idor").some((p) => p.id === "authz-idor"));
  assert.ok(getPattern("ss-sqli")?.family === "ServerSide");
});

test("hypotheses derived from patterns carry patternId and boundary", () => {
  const hs = hypothesesFromPatterns(["API", "Multi-Tenant"]);
  assert.ok(hs.length > 0);
  for (const h of hs) {
    assert.ok(h.patternId && getPattern(h.patternId), "hypothesis must reference a real pattern");
    assert.ok(h.expectedSecureBehavior.length > 0);
  }
});

test("server-side patterns that reach code execution require human approval", () => {
  for (const id of ["ss-ssrf", "ss-xxe", "ss-ssti", "ss-sqli"]) {
    assert.equal(getPattern(id)?.requiresHumanApproval, true, `${id} must require human approval`);
  }
});
