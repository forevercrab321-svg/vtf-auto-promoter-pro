import { test } from "node:test";
import assert from "node:assert/strict";
import { runSupervisor } from "../src/lib/supervisor";

const clean = {
  programAuthorized: true,
  targetInScope: true,
  techniqueAllowed: true,
  automatedTestingAllowed: true,
  rateSafe: true,
  couldAffectOtherUsers: false,
  couldModifyOrDestroyData: false,
  couldDisruptService: false,
};

test("ALLOW when everything is clean", () => {
  assert.equal(runSupervisor(clean).verdict, "ALLOW");
});

test("BLOCK when target is not in scope (Q2)", () => {
  const r = runSupervisor({ ...clean, targetInScope: false });
  assert.equal(r.verdict, "BLOCK");
  assert.ok(r.blockers.some((b) => b.includes("Q2")));
});

test("BLOCK when technique is not allowed (Q3)", () => {
  assert.equal(runSupervisor({ ...clean, techniqueAllowed: false }).verdict, "BLOCK");
});

test("HUMAN_APPROVAL_REQUIRED when it could read others' data", () => {
  const r = runSupervisor({ ...clean, couldReadOthersData: true });
  assert.equal(r.verdict, "HUMAN_APPROVAL_REQUIRED");
  assert.ok(r.humanApprovalRequired);
});

test("HUMAN_APPROVAL_REQUIRED when automated testing is not allowed", () => {
  assert.equal(runSupervisor({ ...clean, automatedTestingAllowed: false }).verdict, "HUMAN_APPROVAL_REQUIRED");
});

test("BLOCK takes precedence over approval conditions", () => {
  const r = runSupervisor({ ...clean, targetInScope: false, couldModifyOrDestroyData: true });
  assert.equal(r.verdict, "BLOCK");
});
