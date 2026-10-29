# XBOW teardown → BountyOS upgrades

A competitive teardown of the leading autonomous bug-bounty systems, and the
guardrail-preserving upgrades we derive from it. Sourced from public material
(see links); vendor/benchmark claims are self-reported unless noted.

## What actually makes XBOW successful

XBOW reached #1 on HackerOne (US, then global) in 2025 and raised $120M at a
$1B+ valuation in March 2026. Reading its public posts, press coverage, and the
open-source systems that chase its benchmark, the moat is **not "scans more."**
It is:

1. **Proof-required validation → low false positives → high Accepted Rate.**
   Coverage notes XBOW had **human review before submission**; the open-source
   chasers converge on the same idea — "verifies, proof-required" (pentestkit),
   "validated findings only" (Buttercup found 28, submitted/patched the
   validated subset). The scarce, valuable capability is *deciding what is real*.
2. **Shared-state orchestration**, not a fixed pipeline. Pentest-Swarm-AI uses a
   **blackboard**: findings are posted, weighted, and decay over time, so the
   right specialist wakes when a signal appears — instead of a rigid
   recon→exploit→report line.
3. **Minimum-proof discipline.** Prove the boundary fails (200 vs 403; an OOB
   callback) rather than exfiltrating data — fast, safe, and report-ready.

The DARPA AIxCC winners are the **authoritative, open, readable** references
(permissively licensed, vetted in a scored competition):
[trailofbits/buttercup](https://github.com/trailofbits/buttercup) (2nd),
[theori-io/aixcc-afc-archive](https://github.com/theori-io/aixcc-afc-archive),
and Team Atlanta's ATLANTIS (1st). Prefer these over the self-reported
community repos for architecture study.

## What we adopt — and what we deliberately do NOT

| XBOW lesson | BountyOS adoption | Guardrail note |
|---|---|---|
| Proof-required validation | **Shipped:** `src/lib/validation.ts` — CONFIRMED requires ≥2 independent reproductions + differential signal + minimal evidence + noise ruled out + every false-positive condition cleared. Enforced at the API: CONFIRMED can't be set by hand. | Pure quality control on findings; touches no target. |
| Kill duplicates early | **Shipped:** `src/lib/duplicate.ts` — matches the internal KB and builds the external search queries (Hacktivity, advisories) for the human to run. | No auto-scraping of platforms (ToS/scope safe). |
| Minimum-proof | Already in the pattern library's `test` fields. | — |
| Blackboard orchestration | **Deferred (design only):** could let Asset Mapper / Surface / Hypothesis agents post weighted signals the Supervisor schedules from. | Supervisor + Scope Guardian stay the deterministic gate. |
| Autonomous live exploitation swarm | **Rejected.** | Would break AUTHORIZED-ONLY / human-control; also gets you banned, which is the opposite of earning. |

## Why this is the right first cut

Our goals are Accepted Rate ↑, Duplicate Rate ↓, invalid research ↓. The
teardown says the money is in *validated* findings, not volume — and validation
was our weakest agent (previously just a status field). This upgrade turns it
into a real gate without adding any attack capability.

## Sources

- XBOW #1 / funding: xbow.com/blog, businesswire (Mar 2026), securityweek.com, techrepublic.com
- AIxCC winners / open source: darpa.mil/news/2025/aixcc-results, blog.trailofbits.com/2025/08/08/buttercup-is-now-open-source
- Community chasers (self-reported): github.com/Armur-Ai/Pentest-Swarm-AI, github.com/lordx64/pentestkit, github.com/speaking-frankly/shannon-pentest
