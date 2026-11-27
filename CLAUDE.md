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

@.claude/CLAUDE_dna_gg.md
@.claude/CLAUDE_dna_rljson.md

<!-- helix:claude_md:end -->
