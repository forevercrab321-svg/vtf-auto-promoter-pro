#!/usr/bin/env node
// ============================================================================
// Skill updater — re-syncs vendored external skills from their upstream repos.
//
//   npm run skills:update            # sync every skill to the ref in the manifest
//   npm run skills:update -- --check # report drift only, change nothing
//   npm run skills:update -- nuwa-skill
//   npm run skills:update -- nuwa-skill --ref main   # upgrade to latest main
//
// Reads .claude/skills/skills.manifest.json, shallow-clones each repo at the
// pinned ref, copies only the paths listed in `include`, and rewrites that
// skill's PROVENANCE.md with the resolved commit.
// ============================================================================

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, cpSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = join(ROOT, ".claude", "skills");
const MANIFEST = join(SKILLS_DIR, "skills.manifest.json");

const argv = process.argv.slice(2);
const checkOnly = argv.includes("--check");
const refFlagIndex = argv.indexOf("--ref");
const refOverride = refFlagIndex !== -1 ? argv[refFlagIndex + 1] : null;
const names = argv.filter((a, i) => !a.startsWith("--") && i !== refFlagIndex + 1);

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (!existsSync(MANIFEST)) fail(`Manifest not found: ${MANIFEST}`);

let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
} catch (e) {
  fail(`Could not parse manifest: ${e.message}`);
}

const selected = manifest.skills.filter((s) => names.length === 0 || names.includes(s.name));
if (selected.length === 0) fail(`No matching skill. Available: ${manifest.skills.map((s) => s.name).join(", ")}`);

let drift = 0;

for (const skill of selected) {
  const ref = refOverride || skill.ref;
  const dest = join(SKILLS_DIR, skill.name);
  console.log(`\n▸ ${skill.name}  (${skill.repo} @ ${ref})`);

  const tmp = mkdtempSync(join(tmpdir(), `skill-${skill.name}-`));
  try {
    // Shallow-fetch just the requested ref.
    git(["init", "-q"], tmp);
    git(["remote", "add", "origin", skill.repo], tmp);
    try {
      git(["fetch", "-q", "--depth", "1", "origin", ref], tmp);
    } catch {
      // Some refs (branch names) need a normal fetch.
      git(["fetch", "-q", "--depth", "1", "origin"], tmp);
    }
    git(["checkout", "-q", "FETCH_HEAD"], tmp);

    const resolved = git(["rev-parse", "HEAD"], tmp);
    const date = git(["log", "-1", "--format=%ad", "--date=short"], tmp);

    // Detect drift against the recorded provenance.
    const provPath = join(dest, "PROVENANCE.md");
    const recorded = existsSync(provPath)
      ? (readFileSync(provPath, "utf8").match(/^- \*\*Commit\*\*: `([0-9a-f]{7,40})`/m) || [])[1]
      : null;

    if (recorded === resolved) {
      console.log(`  = up to date (${resolved.slice(0, 12)}, ${date})`);
      continue;
    }

    drift += 1;
    if (checkOnly) {
      console.log(`  ! drift: installed ${recorded ? recorded.slice(0, 12) : "none"} → upstream ${resolved.slice(0, 12)} (${date})`);
      continue;
    }

    // Replace only the vendored paths; keep the directory otherwise intact.
    for (const rel of skill.include) {
      const from = join(tmp, rel);
      if (!existsSync(from)) {
        console.warn(`  ! missing upstream path, skipped: ${rel}`);
        continue;
      }
      const to = join(dest, rel);
      rmSync(to, { recursive: true, force: true });
      mkdirSync(dirname(to), { recursive: true });
      cpSync(from, to, { recursive: true });
      console.log(`  + ${rel}`);
    }

    writeFileSync(
      provPath,
      `# Provenance — ${skill.displayName || skill.name}

This skill is **vendored** (copied) into this repo so it is versioned and
upgradeable alongside the project. Do not hand-edit the files listed below —
your changes would be overwritten on the next sync. To change behaviour, add a
sibling skill instead.

- **Upstream**: ${skill.repo}
- **Ref requested**: \`${ref}\`
- **Commit**: \`${resolved}\`
- **Upstream date**: ${date}
- **Synced**: ${new Date().toISOString().slice(0, 10)}
- **License**: ${skill.license}${skill.author ? ` © ${skill.author}` : ""}

## Purpose

${skill.purpose}

## Vendored paths

${skill.include.map((p) => `- \`${p}\``).join("\n")}

## Deliberately not vendored

${skill.exclude_note || "n/a"}

## Upgrading

\`\`\`bash
npm run skills:update -- ${skill.name} --ref main   # pull latest
npm run skills:update -- --check                    # report drift only
\`\`\`

After upgrading, bump \`ref\` in \`.claude/skills/skills.manifest.json\` to the
commit printed above so the install stays reproducible, then commit the diff.
`,
    );
    console.log(`  ✓ synced to ${resolved.slice(0, 12)} — review the diff before committing`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

if (checkOnly) {
  console.log(drift === 0 ? "\n✓ all skills up to date" : `\n! ${drift} skill(s) have upstream changes`);
  process.exit(drift === 0 ? 0 : 1);
}
console.log("\nDone.");
