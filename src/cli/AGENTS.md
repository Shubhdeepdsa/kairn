# CLI-specific engineering instructions

> Inherits root `AGENTS.md`. Scope: `src/cli/`.

- The CLI is an adapter over `src/core`; **no filesystem policy logic inside prompt callbacks**.
- Use `@clack/prompts` for interactive TTY flows. Support cancellation via Ctrl+C and prompt cancel sentinel without creating files.
- Provide understandable `--help`, `--version`, and `init` usage. Show only commands actually implemented.
- `kairn init` operates on `process.cwd()` unless an explicitly validated `--cwd` or `--docs` path is supplied. Do not silently follow an unexpected symlink to write outside the intended target.
- Interactive initialization should discover existing `docs/`, explain what exists, offer to reuse or create the folder, and show a concise summary of planned mutations _before writing_. If no interaction is possible, return actionable instructions or require explicit flags such as `--yes`.
- Clack aesthetics must degrade gracefully when stdout/stderr isn't a TTY, in CI, or when `NO_COLOR` is set. Never rely on ANSI color as the only carrier of meaning.
- Structure prompt choices as typed data. Handle all exits and errors centrally, with stable nonzero exit codes on failures; cancellation should be non-destructive.
- Do not prompt during `npm install` and do not auto-install dependencies into users' projects.
- Test CLI flows with injected/mock prompt functions; no interactive subprocess that blocks CI.
- Update `docs/CLI.md` and root README when behavior changes.
