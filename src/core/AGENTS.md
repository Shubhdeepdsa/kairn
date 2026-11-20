# Core-specific engineering instructions

> Inherits root `AGENTS.md`. Scope: `src/core/`.

- The core is a reusable local library and **must not depend on UI, Clack, process exits, browser APIs, or network requests**.
- Start small: `discoverDocumentationRoot`, `planInitialization`, and `applyInitializationPlan` or equivalent cohesive APIs. Separate **planning** a change from **applying** it so previews are reliable and tests are straightforward.
- Default discovery target for a given current directory is a direct child `docs/` directory. Do not recursively scan arbitrary nested projects as part of V1 `init`.
- Only operate within the explicitly chosen root. Normalize/validate paths; avoid accidental traversal, symlink escapes, writing outside scope, and TOCTOU footguns where practical. Keep writes narrowly scoped and non-destructive.
- Never overwrite existing files by default. An existing `docs/` directory is a valid, successful state; repeated initialization must be safe and understandable.
- A non-Git directory is still a valid documentation source. Git detection can be added later, but never require Git for `init`.
- Return structured results, not terminal strings, so future web and CLI adapters can reuse core behavior.
- Use meaningful discriminated unions for results and typed errors only when needed to express a stable contract.
- Export minimal public entry points. TSDoc on exported contracts with meaningful invariants. No generic `utils.ts` dumping ground.
- Document concrete exported behavior in `docs/MODULE_CATALOG.md` once implemented.

- Phase 2: add a read-only nested Markdown service with stable IDs, canonical identities, explicit errors and bounded scans/reads. Reject symlinks; HTTP and UI consume contracts, not filesystem algorithms.

- Phase 3: preserve existing behavior; keep Library/config/source contracts reusable. Isolate persistence tests, validate before writes, and never expose absolute machine paths over HTTP.

- Phase 4: test independent tree/content/config changes, core-only link decisions, atomic recovery, browser history and stale response protection. Browser tests use fake clocks; persistence always stays isolated.
