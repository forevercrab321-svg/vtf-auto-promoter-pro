import { test } from "node:test";
import assert from "node:assert/strict";
import { checkScope, hostMatchesPattern, normalizeHost, parsePolicyToRules } from "../src/lib/scope-guardian";
import type { ScopeRuleInput } from "../src/lib/scope-guardian";

const rules: ScopeRuleInput[] = [
  { kind: "ALLOW", ruleType: "WILDCARD", pattern: "*.acme-demo.example" },
  { kind: "ALLOW", ruleType: "DOMAIN", pattern: "api.acme-demo.example" },
  { kind: "BLOCK", ruleType: "DOMAIN", pattern: "blog.acme-demo.example" },
  { kind: "BLOCK", ruleType: "METHOD", pattern: "DoS" },
];

test("normalizeHost strips scheme, path, port", () => {
  assert.equal(normalizeHost("https://api.acme-demo.example:443/v1/x?y=1"), "api.acme-demo.example");
});

test("wildcard matches subdomains but not the apex", () => {
  assert.equal(hostMatchesPattern("app.acme-demo.example", "*.acme-demo.example", "WILDCARD"), true);
  assert.equal(hostMatchesPattern("acme-demo.example", "*.acme-demo.example", "WILDCARD"), false);
});

test("IN_SCOPE for an allowed subdomain", () => {
  const d = checkScope({ target: "app.acme-demo.example", rules });
  assert.equal(d.status, "IN_SCOPE");
  assert.equal(d.safetyState, "GREEN");
});

test("OUT_OF_SCOPE (RED) for a blocked domain", () => {
  const d = checkScope({ target: "blog.acme-demo.example", rules });
  assert.equal(d.status, "OUT_OF_SCOPE");
  assert.equal(d.safetyState, "RED");
});

test("prohibited technique is RED regardless of asset scope", () => {
  const d = checkScope({ target: "api.acme-demo.example", plannedTestType: "run a DoS flood", rules });
  assert.equal(d.status, "OUT_OF_SCOPE");
  assert.equal(d.safetyState, "RED");
  assert.equal(d.prohibited, "DoS");
});

test("unmatched target is SCOPE_UNKNOWN (never guessed in scope)", () => {
  const d = checkScope({ target: "portal.partner-demo.example", rules });
  assert.equal(d.status, "SCOPE_UNKNOWN");
  assert.equal(d.safetyState, "YELLOW");
});

test("policy parser flags empty ALLOW extraction", () => {
  const { warnings } = parsePolicyToRules("Prohibited: DoS");
  assert.ok(warnings.some((w) => w.includes("No ALLOW rules")));
});
