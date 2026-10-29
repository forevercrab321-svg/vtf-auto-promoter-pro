import { test } from "node:test";
import assert from "node:assert/strict";
import { validateFinding } from "../src/lib/validation";
import { duplicatePreCheck } from "../src/lib/duplicate";

const fullProof = {
  independentReproductions: 2,
  authorizationContextValid: true,
  differentialSignal: true,
  minimumProofEvidence: true,
  environmentalNoiseRuledOut: true,
  businessImpactArticulated: true,
  falsePositiveChecklist: [
    { condition: "shared tenant", cleared: true },
    { condition: "public object", cleared: true },
  ],
};

test("CONFIRMED only when every proof-required criterion is met", () => {
  const r = validateFinding(fullProof);
  assert.equal(r.verdict, "CONFIRMED");
  assert.equal(r.reproducible, true);
  assert.equal(r.unmet.length, 0);
});

test("one reproduction is not enough for CONFIRMED", () => {
  const r = validateFinding({ ...fullProof, independentReproductions: 1 });
  assert.notEqual(r.verdict, "CONFIRMED");
  assert.ok(r.gaps.some((g) => g.toLowerCase().includes("reproduce")));
});

test("missing authorization context blocks validation (UNCERTAIN)", () => {
  const r = validateFinding({ ...fullProof, authorizationContextValid: false });
  assert.equal(r.verdict, "UNCERTAIN");
  assert.ok(r.rationale.toLowerCase().includes("authorization"));
});

test("uncleared false-positive condition with no differential signal => FALSE_POSITIVE", () => {
  const r = validateFinding({
    ...fullProof,
    differentialSignal: false,
    falsePositiveChecklist: [{ condition: "shared tenant", cleared: false }],
  });
  assert.equal(r.verdict, "FALSE_POSITIVE");
});

test("strong-but-incomplete evidence => LIKELY, never CONFIRMED", () => {
  const r = validateFinding({
    ...fullProof,
    environmentalNoiseRuledOut: false, // one gap
  });
  assert.equal(r.verdict, "LIKELY");
  assert.ok(r.unmet.includes("environmental noise ruled out"));
});

test("empty false-positive checklist cannot satisfy CONFIRMED", () => {
  const r = validateFinding({ ...fullProof, falsePositiveChecklist: [] });
  assert.notEqual(r.verdict, "CONFIRMED");
  assert.ok(r.unmet.includes("all false-positive conditions cleared"));
});

test("duplicate pre-check flags high-duplicate classes and builds queries", () => {
  const r = duplicatePreCheck({ title: "Reflected XSS in search", vulnType: "XSS", target: "app.example.com" });
  assert.ok(["MEDIUM", "HIGH"].includes(r.risk));
  assert.ok(r.queries.length >= 3);
  assert.ok(r.queries.every((q) => q.url.startsWith("https://")));
});

test("duplicate pre-check raises risk to HIGH on internal overlap", () => {
  const r = duplicatePreCheck({
    title: "IDOR on object endpoint",
    vulnType: "IDOR / BOLA",
    internalCorpus: [
      { title: "IDOR on object endpoint", body: "object ownership not checked", tags: ["idor"], category: "Duplicate" },
    ],
  });
  assert.equal(r.risk, "HIGH");
  assert.ok(r.internalMatches.length >= 1);
});
