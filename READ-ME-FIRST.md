# Kairn Codex Starter Pack

This pack contains **engineering instructions and initial documentation templates**, not an implemented CLI. Use it to seed a new, empty `kairn` repository before invoking Codex.

## What's inside

- `CODEX_START_PROMPT.md`: paste into Codex after placing the pack into your new local `kairn/` directory.
- `AGENTS.md`: repository-wide engineering rules, docs discipline, safety and commit policy.
- `src/cli/AGENTS.md`: TUI, command interface, and terminal behavior rules.
- `src/core/AGENTS.md`: pure filesystem core, public API, and testing boundaries.
- `tests/AGENTS.md`: tests, fixtures and isolation rules.
- `docs/AGENTS.md`: documentation accuracy and update rules.
- `docs/*.md`: initial product decisions, architecture, CLI contract, catalog and milestones. All unimplemented behaviors are explicitly marked **planned**.

## Use

1. Make a new local folder named `kairn` (not inside a company repo or account).
2. Copy this pack's **contents**, preserving paths, into that folder.
3. Open the folder with Codex and paste `CODEX_START_PROMPT.md`.
4. Codex must verify the authenticated GitHub identity is your **personal** account before creating the public remote and pushing. If ambiguous, it must stop for account confirmation.
5. The GitHub repository does not exist merely because this pack was generated. Codex performs that action in your own environment.

## Intentional scope

First milestone: installable TypeScript CLI, strict quality gates, Clack-powered `kairn init`, safe docs discovery/creation, tests, phased commits and publishing to the user's _personal_ GitHub repository. Not part of this milestone: `kairn run` server, React UI, Git explorer, AI agent hooks, document generation, or a database.

## License

The Codex prompt proposes MIT as a straightforward starting open-source license; check the license text, actual copyright holder, and repo visibility before public publishing.
