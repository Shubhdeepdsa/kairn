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

1. `kairn run` local server and simple Markdown view: next smallest milestone.
2. Global library, project registry and multiple docs sources.
3. Complete document engine, links/search and source-aware navigation.
4. Local Git timeline and document-specific history.
5. Polished Kairn Mineral React interface.
6. Optional project information, integrations and other experiments.
