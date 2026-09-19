# Project skills

Skills in this directory are **project-scoped**: they live in the repo, are
versioned in git, and are available to any agent runtime that reads
`.claude/skills/` (Claude Code, and via the open
[Agent Skills](https://agentskills.io) standard, 50+ others).

This is the upgrade path for the project's agent capabilities — add a skill here
rather than pasting long instructions into a prompt.

## Installed

| Skill | What it does | Source |
|---|---|---|
| `nuwa-skill` | **Skill creation engine.** Distills how a person or topic *thinks* — mental models, decision heuristics, expression DNA, anti-patterns, honest limits — into a new runnable skill. | [alchaincyf/nuwa-skill](https://github.com/alchaincyf/nuwa-skill) (MIT) |

### Using Nuwa

Trigger it in natural language — no slash command needed:

```
蒸馏芒格                      # distill a named person
做一个费曼视角的 skill
我想提升决策质量                # vague need → it diagnoses and recommends who to distill
distill Paul Graham
update the munger skill        # re-distill / upgrade an existing one
```

Nuwa writes the skill it produces into `.claude/skills/<name>/`, so anything it
creates is automatically part of this same versioned system.

> **⚠️ Cost.** Nuwa's own documentation is explicit about this: a full
> distillation is a long multi-agent task (it fans out ~6 parallel research
> agents doing many web searches) and **a single run on a top-tier model has
> cost real users tens of dollars**. It offers three tiers — 快速 (fast, ~⅓ of
> standard), 标准 (standard, default), 深度 (deep) — and will confirm the tier
> with you before starting. Pick 快速 to try it out, and feed it first-party
> material (PDFs, transcripts) when you have them: better input, less searching,
> lower cost.

Nuwa's deep tier can also download video subtitles as source material, which
needs `yt-dlp` on your PATH. It is optional — everything else works without it.

## Adding a skill

**Vendored (from a git repo)** — preferred, because it is reproducible:

1. Add an entry to `skills.manifest.json` (`name`, `repo`, `ref`, `include`).
2. Run `npm run skills:update` — it clones at that ref, copies only the listed
   paths, and writes a `PROVENANCE.md` with the resolved commit.
3. Commit the result.

**Project-authored** — just create `.claude/skills/<name>/SKILL.md` with YAML
frontmatter (`name`, `description`). The `description` is what makes the skill
trigger, so make it concrete and include the phrases you'd actually type.

## Upgrading

```bash
npm run skills:check                            # report drift, change nothing
npm run skills:update                           # re-sync to the pinned refs
npm run skills:update -- nuwa-skill --ref main  # pull latest upstream
```

After pulling a newer commit, bump that skill's `ref` in
`skills.manifest.json` to the commit the script printed, so the install stays
reproducible. Review the diff before committing — a vendored skill's
instructions influence agent behaviour.

Do not hand-edit files inside a vendored skill; the next sync overwrites them.
Add a sibling skill to change behaviour instead.

## Boundary with BountyOS's safety rules

A skill is *instructions*. BountyOS's guardrails are **code**: the Scope
Guardian (`src/lib/scope-guardian.ts`), the Security Supervisor
(`src/lib/supervisor.ts`), and the always-prohibited technique list
(`src/lib/types.ts`) are deterministic engines enforced at the API layer. No
skill dropped into this directory — vendored or authored — can widen scope,
authorize an out-of-scope target, or unblock a prohibited technique. Treat that
as the invariant it is when reviewing any new skill.
