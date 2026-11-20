# Test-specific engineering instructions

> Inherits root `AGENTS.md`. Scope: `tests/`.

- Prefer Vitest with Node file-system temp fixtures. Never create test docs inside the actual user repository or home directory.
- Prioritize observable outcomes over internal implementation details: existing docs remain unchanged; new docs are created only with consent; repeated init is safe; cancel leaves disk unchanged; invalid paths have actionable errors.
- Include at least one CLI integration test with prompts substituted by a deterministic adapter; avoid requiring real TTY interaction in CI.
- Always clean up fixtures, including on assertion failure; ensure tests pass on macOS, Linux, and Windows where applicable.
- No live GitHub interactions, external network, real emails, or secret-bearing fixtures. Local HTTP tests use ephemeral loopback ports and always close servers; browser launch is injected/disabled.
- Do not assert unsupported functionality is implemented. Maintain `docs/TESTING.md` with actual test commands and coverage limitations.

- Phase 3: preserve existing behavior; keep Library/config/source contracts reusable. Isolate persistence tests, validate before writes, and never expose absolute machine paths over HTTP.

- Phase 4: test independent tree/content/config changes, core-only link decisions, atomic recovery, browser history and stale response protection. Browser tests use fake clocks; persistence always stays isolated.
