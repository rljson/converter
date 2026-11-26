# Changelog

## [Unreleased]

### The rljson DNA without the prompts hook

- `@rljson/dna-rljson` 0.4.0: the Claude Code hook that would keep every
  prompt in a project management repo is gone, with `.claude/hooks` and
  `.claude/settings.json`. New are the architecture guide, the
  `/gg-review-architecture` skill and the gg guides and skills of dna-gg
  1.9, and a `.pubignore`.

## [0.1.0]

### CLAUDE.md keeps this repo's own rules

- The rules every rljson repo shares (coverage, pinning, docs, releases,
  reviews) come with the rljson DNA: `doc/guides/rljson-guide.md` and
  `doc/guides/for-ai/rljson-review-guide.md`. `CLAUDE.md` no longer repeats
  them and no longer describes the old `gg one` workflow.

## [0.0.60]

### Developed in gg tickets

- **Developed in gg tickets.** The repo carries the rljson DNA (`@rljson/dna-rljson`): gg's `/gg-*` skills, the guides and the quick check (`.github/workflows/quick_check.yaml`).
- **Pull requests are checked by the quick check** (`gg one did commit`: every commit went through gg's local lint, tests and coverage). `Build and Test` runs on `main` after the merge.
- **`tsconfig.json` lists `node` in `types`:** TypeScript 6 includes no `@types` by default.
- **Dependencies raised to their newest versions** (TypeScript 6 among them).

## [0.0.1]

Initial commit.
