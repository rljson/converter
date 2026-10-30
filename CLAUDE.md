# CLAUDE.md — @rljson/converter

Converts flat/tree-shaped textual data (JSON) into the layer-based RLJSON data
model via a declarative **Decompose Chart**. The public surface is centered on
`fromJson(json, chart)` ([src/converter.ts](src/converter.ts)), plus
`findSliceIdCollisions(json, chart)`, a read-only check that reports the same
sliceId collisions `fromJson` would warn about, grouped per component.

Downstream package — depends on `@rljson/rljson`, `@rljson/json`,
`@rljson/hash`.

## Coverage

`src/index.ts` is excluded from coverage; `src/example.ts` is scaffolding.

## Golden files

Behavior is pinned by golden snapshots in
[test/goldens/example/converter/](test/goldens/example/converter/). When output
changes intentionally, regenerate with `pnpm updateGoldens` and **review the
diff** before committing — never regenerate blindly to make a test pass.

<!-- helix:claude_md:start -->

# gg workflow

This repo is developed ticket by ticket with the `gg` CLI. Follow the
development guide, it tells you when to ask the user and which command
comes next:

@doc/guides/for-ai/ai-dev-guide.md

The steps are also available as skills: `/gg-ticket`, `/gg-commit`,
`/gg-push`, `/gg-review`, `/gg-publish`, `/gg-cleanup`. `/gg` lists them
and says which one comes next.

# rljson additions to the gg workflow

The rules every rljson repo shares:

@doc/guides/rljson-guide.md

- **Reviews** follow `doc/guides/for-ai/rljson-review-guide.md`.
- **Pull requests:** CI on a pull request runs the quick check (`gg one did
  commit`), which passes only for commits made through gg. The full tests run
  on `main` after the merge: watch them after every release.
- **Never merge, publish or delete unasked** — no branch, ticket or ticket
  folder. The owner runs `gg do publish`.

<!-- helix:claude_md:end -->
