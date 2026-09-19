# BountyOS — Bug Bounty AI Research Operating System

A guarded operating system for **authorized** bug bounty & VDP research. It helps
you find high-value, low-duplicate opportunities, map attack surface, generate
testable hypotheses, track findings, and draft professional reports — while a
deterministic **Scope Guardian** and **Security Supervisor** keep everything
inside authorized scope with human control over sensitive actions.

> This is a research **operations** system. It organizes, guards, and documents
> your work. **It does not run automated attacks against targets** — the "testing"
> stage is a gated planning + evidence-tracking layer that you execute manually,
> under scope authorization and (for anything sensitive) human approval.

## Highest principles (enforced in code, not just docs)

```
AUTHORIZED ONLY · SCOPE FIRST · MINIMUM IMPACT
HUMAN CONTROL FOR SENSITIVE ACTIONS
RESEARCH QUALITY > SCAN VOLUME · ACCEPTED REPORTS > RAW FINDINGS
```

Techniques that are **always blocked**, regardless of any program policy: DoS/DDoS,
credential stuffing, password spraying, brute force, social engineering, phishing,
malware, ransomware, persistence, data destruction/deletion, mass user-data
exfiltration, and testing out-of-scope third-party infrastructure. No agent can
override these.

---

## Quickstart (local, zero external services)

**Prerequisites:** Node.js 18.18+ (Node 20/22 recommended).

```bash
# 1. Install dependencies
npm install

# 2. Create your .env (SQLite, no LLM key needed to run)
cp .env.example .env

# 3. Create the local database + demo data in one step
npm run setup        # = prisma generate + db push + db:seed

# 4. Run it
npm run dev          # open http://localhost:3000
```

That's it. The app runs fully **without any API key** using deterministic logic.

To reset the demo data at any time: `npm run db:reset`.

---

## Configuration (`.env`)

| Variable | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | SQLite file for local dev. Swap for Postgres to deploy. |
| `LLM_PROVIDER` | `none` | `none` \| `anthropic` \| `openai` \| `gemini`. Only affects report/hypothesis *wording*. |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` | — | Optional. Enables AI-assisted drafting. |
| `ENABLE_ACTIVE_TESTING` | `false` | Master switch; kept off — the system stays planning-only. |

**Never commit `.env`.** It is git-ignored.

---

## How to use it

1. **Add a program** — *Programs → Add program*. Paste the program's policy text.
   The **Scope Guardian** parses it into candidate `ALLOW`/`BLOCK` rules and flags
   anything ambiguous. **Program Intelligence** scores it by *Expected Research
   Value* (not just max bounty) and assigns Priority A/B/C.
2. **Confirm scope** — open the program, review the machine-readable rules, and add
   any that are missing. Use **"Check a target"** to see `IN_SCOPE / OUT_OF_SCOPE /
   SCOPE_UNKNOWN` with a GREEN/YELLOW/RED safety state.
3. **Add targets** — each target is auto-checked against scope and shows its safety
   state. Only `IN_SCOPE` (GREEN) targets can be analyzed or tested.
4. **Map + hypothesize** — on an in-scope target, *Run analysis* to build the attack
   surface and generate testable hypotheses (authorization, IDOR/BOLA, multi-tenant,
   business logic — the high-value space).
5. **Plan a test** — the **Security Supervisor** runs a 9-question gate. If the test
   could touch anything sensitive (reading others' data, modifying data, cost,
   messaging, disruption, unclear scope), it becomes `HUMAN_APPROVAL_REQUIRED` and
   appears in **Approvals**. No valid Authorization Token → the test stays blocked.
6. **Log & validate findings** — set validation state; only `CONFIRMED` findings can
   be marked `READY`/`SUBMITTED`. Estimate **Duplicate Risk**.
7. **Draft a report** — *Findings → Draft report* produces the standard structure
   (Title, Summary, Asset, Prerequisites, Steps, Expected/Actual, Impact, Proof,
   Remediation). Evidence is auto-redacted. **Human review is required** before you
   submit anywhere.
8. **Track ROI** — *Rewards* shows acceptance rate, duplicate rate, reward/hour, and
   program ROI. *Overview* shows the Daily Security Research Brief.

---

## The pipeline & the 15-agent team

```
Program Discovery → Rule Parsing → Scope Verification → Target Prioritization
→ Passive Recon → Attack Surface Mapping → Hypothesis Generation
→ Safe Authorized Testing → Potential Finding → Validation → Duplicate Check
→ Evidence Package → Report Draft → HUMAN REVIEW → Ready to Submit
→ Result Tracking → Knowledge Update
```

Agents 01–15 (Program Scout, Program Intelligence, **Scope Guardian**, Asset Mapper,
Attack Surface Analyst, Vulnerability Hypothesis, Safe Testing, Finding Validation,
Duplicate Risk, Evidence, Report Writer, Reward/ROI Analyst, Knowledge Base,
**Security Supervisor**, Operations Manager). The two gatekeepers (Scope Guardian,
Security Supervisor) are **deterministic rule engines** — never LLM guesses. See the
full team on the Overview page.

---

## Architecture

- **Next.js 14 (App Router) + TypeScript** — dashboard + API in one process.
- **Prisma + SQLite** — local-first, zero-setup. Swap to Postgres/Supabase for deploy.
- **Tailwind CSS** — GREEN/YELLOW/RED safety states throughout.
- **`src/lib/`** — the engines: `scope-guardian.ts`, `supervisor.ts`, `opportunity.ts`,
  `attack-surface.ts`, `hypotheses.ts`, `report.ts`, `redact.ts`, `metrics.ts`,
  `brief.ts`, `agents.ts`, `llm.ts` (provider-agnostic, optional).
- **`src/app/api/`** — REST routes for every entity + the scope/supervisor gates.
- **`prisma/schema.prisma`** — Program, ScopeRule, Asset, Target, AuthorizationToken,
  AttackSurfaceItem, Hypothesis, SafeTest, Finding, Evidence, Report, Approval,
  KnowledgeEntry, ResearchLog, AgentRun.

### Scripts

| Command | Does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run setup` | Generate client + create DB + seed demo data |
| `npm run db:seed` / `npm run db:reset` | Seed / wipe+reseed demo data |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` / `npm run typecheck` / `npm test` | Verify |

---

## Deploying (Postgres / Supabase)

1. In `prisma/schema.prisma`, set `datasource db { provider = "postgresql" }`.
2. Set `DATABASE_URL` to your Postgres/Supabase connection string.
3. `npx prisma migrate deploy` (or `db push`), then deploy to Vercel/anywhere Node runs.

SQLite is perfect for local use; serverless platforms need Postgres because their
filesystem is ephemeral.

---

## Legal & ethical use

Only work on programs that **explicitly authorize** you, and only within their stated
scope and rules. When a program has no legal API for automation, do not bypass logins,
captchas, rate limits, or access controls — import data manually instead. This tool is
built to keep you inside those lines; it is your responsibility to stay there.
