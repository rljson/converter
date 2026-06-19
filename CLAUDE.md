# CLAUDE.md — @rljson/converter

Converts flat/tree-shaped textual data (JSON) into the layer-based RLJSON data
model via a declarative **Decompose Chart**. The public surface is a single
function, `fromJson(json, chart)` ([src/converter.ts](src/converter.ts)).

Downstream package — depends on `@rljson/rljson`, `@rljson/json`,
`@rljson/hash`. When those publish a new version, run `pnpm update --latest`
here before your own publish.

---

## Non-Negotiable Constraints

- **Never commit directly to `main`.** Always work on a feature branch and land
  changes through a PR (see Ticket Workflow). No exceptions, no hotfixes on main.
- **Never modify the `scripts` section in `package.json`** without explicit user
  permission.
- **100% test coverage** on all new/modified `src/` files (Statements, Branches,
  Functions, Lines). `src/index.ts` is excluded from coverage; `src/example.ts`
  is scaffolding.

---

## Commit Discipline (MANDATORY — NEVER SKIP)

- **Commit small and often** — one logical unit = one commit. Never accumulate
  more than ~5 changed files before committing.
- `git status --short` must return **nothing** at session end. Never leave
  uncommitted changes behind.
- **Check state at every session start**: `git status --short`, `git branch`,
  `git log --oneline -3`.

### Pre-commit checklist (in order, no exceptions)

1. **Update docs FIRST** — update [README.public.md](README.public.md),
   [README.architecture.md](README.architecture.md), and this CLAUDE.md for any
   API/behavior change **before** proposing a commit. A feature is NOT complete
   until documentation matches.
2. **Fix TypeScript/lint errors** in every touched file (use the IDE error checker).
3. **`pnpm exec eslint <changed-files>`** to catch lint violations.
4. **`pnpm test`** — must pass at 100% coverage. Fix all errors before moving on.

### Golden files

Behavior is pinned by golden snapshots in
[test/goldens/example/converter/](test/goldens/example/converter/). When output
changes intentionally, regenerate with `pnpm updateGoldens` and **review the
diff** before committing — never regenerate blindly to make a test pass.

### Version bump = separate commit

```bash
pnpm version patch --no-git-tag-version
git commit -am"Increase version"
```

---

## Full Ticket Workflow (exact order — complete all steps before the next ticket)

```bash
# 1. Start clean
git checkout main && git fetch && git pull

# 2. Feature branch (kebab-cased automatically)
node scripts/create-branch.js "<description>"

# 3. Update deps
pnpm update --latest

# 4. Develop, write tests, update docs

# 5. Commit every ≤5-file logical unit
git add . && git commit -am"<description>"

# 6. Version bump
pnpm version patch --no-git-tag-version && git commit -am"Increase version"

# 7. Build (runs tests via prebuild)
pnpm run build

# 8. Rebase onto latest main
git rebase main

# 9. Push (refuses dirty tree; refuses push to main)
node scripts/push-branch.js

# 10. Create PR + auto-merge
gh pr create --base main --title "<title>" --body " "
gh pr merge --auto --squash

# 11. Wait for merge
node scripts/wait-for-pr.js

# 12. Cleanup
node scripts/delete-feature-branch.js
```

**`pnpm link` is acceptable during development for local cross-repo
dependencies. Before PR/merge: remove all `pnpm.overrides` using `link:../...`
and restore published versions of `@rljson/*` in `package.json` +
`pnpm-lock.yaml`.**

---

## Git Scripts Reference

| Script | Guard |
|---|---|
| `node scripts/create-branch.js "desc"` | Kebab-cases input; fails without a name |
| `node scripts/push-branch.js` | Refuses dirty tree; refuses push to `main` |
| `node scripts/wait-for-pr.js` | Polls until MERGED/CLOSED |
| `node scripts/delete-feature-branch.js` | Requires clean tree + merged branch |
| `node scripts/is-clean-repo.js` | Prints ✅/❌ |

Never bypass these with raw git commands.

---

## Pre-existing Coverage Failures

Pre-existing failures (in files NOT touched in this ticket) do not block a
commit, but:
- Prove pre-existing: `git stash && pnpm test; git stash pop`
- Document in the commit message
- Never add NEW failures in modified files

---

## Coverage Requirements

- **All metrics MUST be 100%**: Statements, Branches, Functions, Lines
  (enforced in [vitest.config.mts](vitest.config.mts)).
- Coverage validates automatically in `pnpm test`. Build fails below 100%.
- **Never** use `/* v8 ignore */` to avoid writing tests for reachable code.

### Vitest 4.x semantic ignore hints (MANDATORY)

All hints MUST include `-- @preserve` to survive esbuild transpilation.

| Pattern | Meaning |
|---|---|
| `/* v8 ignore if -- @preserve */` | Ignore the if-branch |
| `/* v8 ignore else -- @preserve */` | Ignore the else-branch |
| `/* v8 ignore next -- @preserve */` | Ignore next statement/expression |
| `/* v8 ignore file -- @preserve */` | Ignore entire file |
| `/* v8 ignore start -- @preserve */` ... `/* v8 ignore stop -- @preserve */` | Ignore a range |

**NEVER use:**

```typescript
/* v8 ignore next 3 -- @preserve */  // ❌ line-counting — fragile, breaks on refactoring
/* v8 ignore next */                  // ❌ missing @preserve — esbuild strips the comment
/* v8 ignore end */                   // ❌ 'end' not 'stop'
```

---

## Package Manager & Tooling

- Uses **pnpm**. **Never modify the `scripts` section in `package.json`** without
  explicit user permission.
- **ESM modules** (`"type": "module"`); Node `>=22.14.0`.
- **ESLint 10** (`eslint@^10.4.0`) with `typescript-eslint@^8.x`. After
  `pnpm update --latest`, run `pnpm exec eslint` to confirm the config still loads.
- **License headers** required in all source files.
- **Test framework**: Vitest with `describe()`, `it()`, `expect()`.

---

## Testing

| Command | Purpose |
|---|---|
| `pnpm test` | All tests + coverage + lint |
| `pnpm run build` | Full build (`prebuild` runs tests, then vite build + tsc + copy README) |
| `pnpm updateGoldens` | Regenerate golden snapshot files |
| Debug in VS Code | Open test file → set breakpoint → Alt+click play button in Test Explorer |

---

## Publish Workflow (MANDATORY)

### Pre-publish checklist

1. Remove all `pnpm.overrides` using `link:../...`; restore `package.json` +
   `pnpm-lock.yaml` to published `@rljson/*` versions.
2. `pnpm install` — reinstall with published versions.
3. `pnpm test` — must pass at 100%.
4. `pnpm run build`.
5. `pnpm version patch --no-git-tag-version && git commit -am"Increase version"`.
6. Commit ALL files including `package.json` and `pnpm-lock.yaml`.

### Merge & publish

Land the branch through the normal Ticket Workflow (PR + auto-merge), then from a
clean `main`:

```bash
git checkout main && git pull
node scripts/publish-to-npm.js   # guards: must be a clean main branch
```

`scripts/publish-to-npm.js` refuses to run on a dirty or non-`main` branch.
Because the converter is downstream, publish it only **after** any upstream
`@rljson/*` changes it depends on have been published and pulled in via
`pnpm update --latest`.
