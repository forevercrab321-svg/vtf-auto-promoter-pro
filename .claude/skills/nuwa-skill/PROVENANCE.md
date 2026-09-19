# Provenance — 女娲 · Skill造人术 (Nuwa)

This skill is **vendored** (copied) into this repo so it is versioned and
upgradeable alongside the project. Do not hand-edit the files listed below —
your changes would be overwritten on the next sync. To change behaviour, add a
sibling skill instead.

- **Upstream**: https://github.com/alchaincyf/nuwa-skill.git
- **Ref requested**: `fe0374687037c4cc51a65c1e0c145afe2981dc69`
- **Commit**: `fe0374687037c4cc51a65c1e0c145afe2981dc69`
- **Upstream date**: 2026-08-25
- **Synced**: 2026-09-19
- **License**: MIT © Huashu (花叔)

## Purpose

Skill creation engine — distills a person's or topic's thinking (mental models, decision heuristics, expression DNA) into a runnable Agent Skill.

## Vendored paths

- `SKILL.md`
- `LICENSE`
- `references`
- `scripts`

## Deliberately not vendored

examples/ (2.5MB of demo perspective skills), promo/, .github/ and all PNG/JPG assets are intentionally NOT vendored — the engine does not need them. See PROVENANCE.md.

## Upgrading

```bash
npm run skills:update -- nuwa-skill --ref main   # pull latest
npm run skills:update -- --check                    # report drift only
```

After upgrading, bump `ref` in `.claude/skills/skills.manifest.json` to the
commit printed above so the install stays reproducible, then commit the diff.
