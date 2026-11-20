# Roadmap and phase boundaries

**Status: PLANNED.** One increment at a time; do not ship future modules as empty placeholders.

## Current task — foundation + safe init

- Phase A: git/npm/TypeScript CLI entry point; `--help`, `--version`.
- Phase B: repository-wide engineering rules, product docs and essential OSS governance.
- Phase C: formatting, linting, strict typecheck, test runner and Markdown checks.
- Phase D: reusable read-only docs discovery and safe initialization planner/applier; fixtures and tests.
- Phase E: attractive accessible Clack `kairn init`, cancellation/non-TTY support and CLI tests.
- Phase F: GitHub Actions checks, README, validation, push **separate commits** to personal `PERSONAL_LOGIN/kairn`.

Each phase gets its own meaningful Conventional Commit after checks. If a phase includes multiple genuinely distinct concerns, make more than one commit; do not artificially split each file into its own commit.

## Later phases (do not implement now)

1. `kairn run` local server, simple Markdown view.
2. Global library, project registry and multiple docs sources.
3. Complete document engine, links/search and source-aware navigation.
4. Local Git timeline and document-specific history.
5. Polished Kairn Mineral React interface.
6. Optional project information (hosting, ownership), integrations and other experiments.
