# Practice lab runbook

A safe, legal way to exercise the full BountyOS pipeline and **measure the team's
capability** against a known answer key — before touching any real program.

## Why this first

Our goals are acceptance rate ↑ and duplicate/invalid rate ↓. You can't improve
what you can't measure. OWASP Juice Shop is the official, deliberately-vulnerable
training app; it ships a **Score Board** that marks each solved challenge. That
gives us ground truth to score the pipeline: hit rate, false positives, and how
much the proof-required gate helps.

## 1. Run the lab locally (your machine, offline)

```bash
# Docker (simplest). Juice Shop serves on :3000.
docker run --rm -p 3000:3000 bkimminich/juice-shop
```

Open http://localhost:3000 to confirm it's up. (Docs: https://owasp.org/www-project-juice-shop/)

> Note: BountyOS dev server also defaults to :3000. Run one of them on another
> port — e.g. start BountyOS with `PORT=3100 npm run dev`.

## 2. Load the lab into BountyOS

```bash
npm run db:seed:lab    # adds the practice program + target + hypotheses
PORT=3100 npm run dev  # open http://localhost:3100
```

This creates:
- a **Program** "OWASP Juice Shop (local practice lab)" scoped to `localhost` only,
- a **Target** "Juice Shop (local)" that the Scope Guardian marks IN_SCOPE / GREEN,
- a mapped **attack surface** and **pattern-derived hypotheses** (from the existing
  Pattern Library — nothing new to attack, just testable questions).

## 3. Walk the human-in-the-loop pipeline

For each hypothesis on the target page:
1. Read its `expectedSecureBehavior` and `testStrategy` (minimum-impact, your own
   accounts/data on the local instance).
2. Do the test yourself against **your local** Juice Shop.
3. Record the observation, then run the **proof-required validation** panel on the
   finding. CONFIRMED requires ≥2 independent reproductions + differential signal
   + cleared false-positive checklist.
4. Generate the report; it auto-cites the matched pattern's OWASP/CWE references.

## 4. Score yourself against ground truth

Compare your CONFIRMED findings to Juice Shop's Score Board:
- **Hit rate** = challenges you found / total you attempted.
- **False-positive rate** = findings the gate let through that the Score Board
  doesn't recognize → tune the validation inputs / pattern false-positive lists.
- **Time per confirmed finding** → the efficiency metric that actually matters.

Only once these numbers look good on the lab should you point the *workflow* (not
this environment) at a real, authorized program you've enrolled in.

## Boundaries (unchanged)

The lab's scope is `localhost` **only**. The Scope Guardian will mark any other
host SCOPE_UNKNOWN/RED. Do not repoint this program at a site you don't control.
BountyOS organizes and validates your research; you run the tests, under scope,
with human review — exactly as on a real program.
