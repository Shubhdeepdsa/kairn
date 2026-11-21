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

## Later phases

1. Local scoped search: Phase 5 implementation below.
2. Local Git timeline and document-specific history: PLANNED.
3. Polished Kairn Mineral React interface: PLANNED.
4. Optional project information and integrations: DEFERRED.

## Acceptance follow-up

Initial remote CI exposed Windows CRLF checkout drift. The follow-up enforces LF
with `.gitattributes`; formatter behavior and check strictness are unchanged.

## Phase 2 — VERIFIED; merged

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
was merged into main. The [feature CI run](https://github.com/Shubhdeepdsa/kairn/actions/runs/44716122814)
passed Linux, macOS and Windows at `3633546`. No automatic merge or npm publication.

## Phase 3 — COMPLETE; VERIFIED and merged

A: architecture; B: schemas/persistence; C: Library; D: resolver; E: discovery/ignore;
F: multi-source engine; G: CLI integration; H: acceptance and personal feature PR.

| Stage | Commit    | Verified outcome                                         |
| ----- | --------- | -------------------------------------------------------- |
| 3A    | `e5b82f7` | Architecture and instructions                            |
| 3B    | `b829e0a` | Schemas and safe JSON storage                            |
| 3C    | `ea633c1` | Persistent project Library                               |
| 3D    | `02ef680` | Portable/shared/personal resolution                      |
| 3E    | `2c4656a` | Source discovery, overlap and limited exclusions         |
| 3F    | `6c54e17` | Multi-source document composition                        |
| 3G    | `e2579dc` | Project CLI and run integration                          |
| 3H    | `f0570f0` | 79 tests, clean install and installed-package acceptance |

Phase 3 defers the final React/settings UI, themes, search, Git history, cloud,
AI and npm publication. Next smallest milestone: source-configuration reload
without restarting the viewer, preserving the same validation boundaries.

Phase 3 feature branch: `feat/project-library-config`;
[PR #2](https://github.com/Shubhdeepdsa/kairn/pull/2) was merged into `main` on
2026-11-20 using **Create a merge commit**. Merge commit `c03057e` preserves the
full staged implementation history through `68986d5`.
The [push run](https://github.com/Shubhdeepdsa/kairn/actions/runs/44726328194) and
[PR run](https://github.com/Shubhdeepdsa/kairn/actions/runs/44726417025) at `f0570f0`
passed all Linux/macOS/Windows jobs. `b7208ee` adds a focused Windows cross-drive
overlap correction; latest-head checks are visible on the PR.

## Phase 4 — COMPLETE; VERIFIED and merged

A contracts; B content freshness; C configuration reload; D core links; E bounded
diagnostics; F URL/history; G outline/accessibility; acceptance and feature PR.

| Stage      | Commit    | Outcome                                             |
| ---------- | --------- | --------------------------------------------------- |
| 4A         | `8686f64` | Freshness, link and navigation contracts            |
| 4B         | `584229a` | Conditional active-content refresh                  |
| 4C         | `e3d3ecf` | Atomic project settings reload                      |
| 4D         | `f010b23` | Reusable canonical link resolution                  |
| 4E         | `9a43495` | Bounded current-document diagnostics                |
| 4F         | `50a07ec` | Document/heading URLs and browser history           |
| 4G         | `0dddfbd` | Outline, layout and accessibility                   |
| Acceptance | `82ff53e` | Clean install, 95 tests and installed-package smoke |

Live source/configuration reload planned after Phase 3 is now implemented. Next
smallest milestone: an explicit bounded CLI command for current-document link
diagnostics, reusing the same core service without a project-wide index.

Final React/Stitch UI, themes, search, Git history, cloud, AI, clipboard/code-copy,
and syntax highlighting remain deferred. No manual browser verification is claimed:
browser control is disabled in Work settings; DOM tests use the real localhost API.

Feature branch `feat/document-reading-experience` is pushed to the personal
repository. [PR #3](https://github.com/Shubhdeepdsa/kairn/pull/3) is open, unmerged.
The [push CI run](https://github.com/Shubhdeepdsa/kairn/actions/runs/44732707496)
at `82ff53e` passed Linux, macOS and Windows; latest-head/integration checks are
visible on the PR. Browser verification remains API/DOM-only as documented.

## Phase 5 — local scoped search

IMPLEMENTED; local checks VERIFIED; three-OS evidence is recorded below and latest
head checks are tracked on PR #4. Real browser acceptance
remains separate; [PR #4](https://github.com/Shubhdeepdsa/kairn/pull/4) merged as `ccdec257`.
Windows bounded-indexing test correction PR #5 merged as `5c31057`.
Preserve Phases 1–4.
See [search design](SEARCH.md) and [manual acceptance](SEARCH_ACCEPTANCE.md).

| Stage | Commit    | Outcome                                                      |
| ----- | --------- | ------------------------------------------------------------ |
| 5A    | `5d7cd5d` | Scope/result/coverage/destination contracts and architecture |
| 5B    | `0dd316b` | Shared-parser section extraction                             |
| 5C    | `96e6e46` | Private incremental rebuildable FTS5 cache                   |
| 5D    | `d0f880b` | Scoped literal queries, ranking, grouping and snippets       |
| 5E    | `2c5f64f` | Bounded global/session coordinator and lazy worker           |
| 5F    | `4bfb9d1` | Independent project navigation and scoped reader/history     |
| 5G    | `f32a7ac` | Framework-independent palette controller                     |
| 5H    | `9422620` | Minimal accessible vanilla palette                           |

Phase 4 PR #3 merged as `c76f1b5`; Phase 5 starts from that main commit.
Phase 4 manual browser checks were confirmed by the user before this phase.
Phase 5 manual browser checks remain separate; do not infer them from that confirmation.

Acceptance follow-ups: `a220807` makes the offline installed-package fixture
reproducible on clean CI caches; `bb0c260` reports persisted-document coverage
accurately. [Three-OS verification](https://github.com/Shubhdeepdsa/kairn/actions/runs/44794623663)
passed at `bb0c260`. No automatic merge or npm publication.

`e2c0f14` resumes bounded global jobs without restarting completed projects. Schema-v2
approval fences prevent stale cooperating writers from bypassing newer source/ignore
rules. Final local suite: 120 tests. Human browser acceptance remains outstanding.

## Phase 6A — React foundation (IMPLEMENTED; local checks VERIFIED)

Architecture/migration → React/Vite/Tailwind build → bounded packaged serving →
routes/shared layouts → Button/icons/tokens → typed API/state/settings contracts →
architecture enforcement → installed browser acceptance and size baseline.
See [frontend contracts](FRONTEND.md). Keep the working Phase 5 reader at `/`.
Phase 6B: Mineral tokens/components; Phase 6C: React Documentation Explorer parity.
No Git services, settings mutation APIs or final screen designs in Phase 6A.

Clean exported-tree verification passes npm ci, all quality gates, 149 tests in
34 files and the real installed-package Chromium smoke. Three-OS CI is tracked
on the Phase 6A PR. Shared shell/API/tokens/layouts and lazy routes are foundations
for 6B; no canonical reader switch occurs before 6C parity.

## Phase 6B — Mineral design system (IMPLEMENTED; local checks VERIFIED)

Phase 6A merged as `a373192`. Normalize references, implement semantic themes and
fonts, reusable controls/layouts/icons/prose, then showcase and browser/visual
acceptance. No Explorer implementation; Phase 6C composes these primitives.

Mineral implementation preserves Phases 1–6A. Local tests: 157 in 35 files plus
three installed-browser tests and four reviewed visual baselines. Cross-platform
CI is reported on the Phase 6B PR; no merge or npm publication is automatic.

## Phase 6C — React Documentation Explorer

- **Phase 6C-0: Reference audit (IMPLEMENTED; VERIFIED)**
  Comprehensive audit of 38 PNG mockups, 26 HTML screens, 6 SVGs, and canonical screenshots recorded in `docs/EXPLORER_DESIGN_MAPPING.md`. Fixtures created and unit tested in `src/frontend/features/design-system/explorer-fixtures.ts`.
- **Phase 6C-1: Visual integration (IMPLEMENTED; VERIFIED)**
  Reusable 3-region Explorer shell, hierarchical navigation tree, reading plane, outline TOC, pager, and callout primitives integrated with Mineral design tokens. Runtime fixture specimen active at `/app/design-system/explorer`. Accessibility, responsive reflow, and visual baselines verified across 173 Vitest unit tests and 5 Playwright browser tests.
- **Phase 6C-2A: Tree and data integration (IMPLEMENTED; VERIFIED)**
  Real server-backed project tree data (`/api/projects/:projectId/tree`), typed client methods, hierarchical `DocTree` with per-project collapse state retention, Phase 5 default document discovery (`README.md` first), and active document routing at `/app/projects/:projectId/docs`.
- **Phase 6C-2B: Safe reader, TOC & link resolution (IMPLEMENTED; VERIFIED)**
  Audited `SafeHtmlArticle` trust boundary consuming server-rendered safe Markdown HTML (`DocumentResponse.html`). Heading outline TOC with scroll spy intersection observer, waypoint dot indicator, Unicode headings, and duplicate slug handling. Local Markdown link interception with core link resolution (`client.resolveLink`), scan-time diagnostics rendering, and runtime link failure callouts. 193 Vitest unit tests in 39 files and 7 Playwright browser tests passing.
- **Phase 6C-2C: Search palette, live reading & bookmarks (IMPLEMENTED; VERIFIED)**
  Adapted framework-independent `SearchPalette` controller into modal search palette dialog with query debounce, generation counters, keyboard navigation, and `@project` selector chips. Integrated header search trigger button and `Cmd+K` / `Ctrl+K` shortcuts. Implemented live reading freshness loop with ~2s cadence, hidden-tab pausing, `If-None-Match` HTTP 304 handling without DOM re-render, vanished document fallback with warning banner, and legacy reader bookmark navigation parity. 199 Vitest unit tests in 40 files and 8 Playwright browser tests passing.
- **Phase 6C-2D: Documentation Explorer acceptance & second PR (NEXT)**
  Run complete acceptance verification matrix, test packed installation offline smoke test, verify vanilla reader and `/app` parity, push stacked feature branch `feat/6c-documentation-explorer` and open PR #2 against `feat/6c-visual-foundation`.
