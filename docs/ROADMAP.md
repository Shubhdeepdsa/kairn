# Roadmap and phase boundaries

## Completed initial milestone

Local verification on Node 26.13.0, 2026-11-20:

| Phase | Commit    | Outcome                                           | Verification                                |
| ----- | --------- | ------------------------------------------------- | ------------------------------------------- |
| A     | `720f4cf` | TypeScript executable and package                 | Typecheck, build, help/version and npm exec |
| B     | `f260115` | MIT license, governance and documentation         | Reviewed policies and staged diff           |
| C     | `2e9ac2b` | Quality scripts, ESLint/TSDoc, Vitest, formatting | All six quality gates; two baseline tests   |
| D     | `485f28f` | Safe core discovery, plan, apply                  | All quality gates; nine tests               |
| E     | `0feb387` | Clack init wizard and prompt boundary             | All quality gates; 19 tests                 |
| F     | `3d473eb` | Read-only CI on three operating systems           | Clean npm ci and all local quality gates    |

Final acceptance also installed the packed tarball into an isolated temporary
prefix and verified installed help/version and first/repeated `init --yes`.
Real pseudo-terminal checks verified create confirmation and Ctrl+C cancellation.
Remote CI results are separate from local verification; see GitHub Actions.
Publication is authorized only to the verified personal user account, after review.

## Later phases (not implemented)

1. `kairn run` local server and simple Markdown view: implemented in Phase 2 below.
2. Global library, project registry and multiple docs sources.
3. Complete document engine, links/search and source-aware navigation.
4. Local Git timeline and document-specific history.
5. Polished Kairn Mineral React interface.
6. Optional project information, integrations and other experiments.

## Acceptance follow-up

Initial remote CI exposed Windows CRLF checkout drift. The follow-up enforces LF
with `.gitattributes`; formatter behavior and check strictness are unchanged.

## Phase 2 — VERIFIED; PR review pending

A. Update milestone instructions, architecture, contracts and security decisions.
B. Read-only nested document engine with bounded scanning and safe reads.
C. Secure loopback HTTP with structured API errors and shutdown.
D. Minimal vanilla viewer and safe Markdown rendering.
E. `kairn run` CLI, browser opening and signal lifecycle.
F. Clean-package acceptance, documentation and cross-platform CI; feature PR.

| Phase          | Commit    | Verification                                                     |
| -------------- | --------- | ---------------------------------------------------------------- |
| A — planning   | `73a08fb` | Documentation formatting/lint and staged review                  |
| B — core       | `f1c7c61` | Quality gates; 27 tests                                          |
| C — server     | `c821dae` | Quality gates; 35 tests                                          |
| D — viewer     | `a96d4ea` | Quality gates; 41 tests                                          |
| E — CLI        | `b7cafc9` | Quality gates; 48 tests                                          |
| F — acceptance | `3633546` | Clean install, all gates, 51 tests and real-browser self-viewing |

The installed package served Kairn's own docs without modifying their hashes.
The default port was occupied and correctly reported a conflict; self-viewing
used `--port 0`. Real browser navigation/headings/tables and real Ctrl+C shutdown
were verified. Cross-platform results are reported by the feature PR's CI.

Automatic bounded navigation refresh is now implemented: new, renamed and
deleted Markdown files appear without restarting. No registry or persistence.
Next smallest milestone: refresh the current document after source content edits.

Feature branch: `feat/local-documentation-viewer`; [PR #1](https://github.com/Shubhdeepdsa/kairn/pull/1)
is open against main. The [feature CI run](https://github.com/Shubhdeepdsa/kairn/actions/runs/44716122814)
passed Linux, macOS and Windows at `3633546`. No automatic merge or npm publication.
