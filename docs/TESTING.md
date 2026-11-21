# Verification and quality strategy

**Status: IMPLEMENTED; local quality gates run during each phase.**

## Intended scripts

- `npm run typecheck`: strict TypeScript check.
- `npm run lint`: ESLint; prefer TSDoc rule validation for public API comments.
- `npm run format:check`: Prettier check.
- `npm test`: Vitest unit/CLI integration tests.
- `npm run build`: produce installable CLI assets; verify package bin points to compiled executable.
- `npm run docs:lint`: Markdown linting; no broken internal links where practicable.

## Minimum safety matrix

| Scenario                       | Expected result                                                              |
| ------------------------------ | ---------------------------------------------------------------------------- |
| Empty temporary directory      | Creates `docs/` only after user approves                                     |
| Existing `docs/` with Markdown | Preserve all bytes; no overwrite                                             |
| Second `init`                  | No destructive changes                                                       |
| User cancels                   | No filesystem modifications                                                  |
| Non-TTY without explicit flags | Clear actionable error; no hanging                                           |
| Invalid/unwritable root        | Safe error, no partial undocumented writes                                   |
| Docs symlink escaping target   | Reject or safely handle explicitly; never silently write outside chosen root |
| Missing `.git`                 | `init` still works                                                           |

Tests must use isolated temporary directories, never the actual repository or user home. CI runs on each push and pull request with least-privilege permissions. Once implemented, record the actual tested scripts and limitations.

## Phase A

Node 26 is available. TypeScript 6.0.3 is selected because the current
TypeScript ESLint peer range excludes TypeScript 7. Build and typecheck scripts
are available; automated tests follow in Phase C.

## Quality gates

All six required scripts now exist. `npm test` uses Vitest with deterministic
subprocess help/version checks against compiled output.
ESLint validates TypeScript and TSDoc syntax. Prettier and markdownlint check
repository documentation as well as source. Line length and table alignment
Markdown rules are disabled to permit readable prose and Prettier tables.

## Core coverage

Temporary fixtures verify read-only plans, consent/decline, creation without Git,
byte-preserving reuse, repeat runs, direct-child-only detection, missing roots,
file conflicts, root/docs symlinks, stale plans and unreadable roots. Permission
checks skip on Windows and privileged users, where POSIX mode bits are unreliable.
Concurrent hostile ancestor replacement is outside the supported threat model.

## CLI coverage

`npm test` builds first, then runs fake-prompt create/reuse, select cancellation,
keyboard sentinel, declined confirmation, confirmation sentinel, non-TTY and
explicit-yes tests. Built-binary subprocesses verify help/version, errors,
first/repeated init and plain NO_COLOR output. Real terminal rendering is not
asserted by unit tests; Clack owns keyboard input and terminal styling.

## Continuous integration

`.github/workflows/ci.yml` runs all required checks with Node 26 on Linux, macOS
and Windows for pushes and pull requests. Permissions are read-only. Official
checkout/setup-node v5 actions are pinned to commit SHAs resolved from their
upstream tags; review release notes and resolve a new upstream SHA when updating.
No publishing, deployment or secrets are involved.

## Dependency audit limitation

The current npm audit reports eight development-tool advisories (four low, four
moderate) through TSDoc linting's nested minimatch and Markdown linting's KaTeX.
No runtime dependency advisories are reported by `npm audit --omit=dev`.
Suggested force fixes downgrade direct tooling; they have not been applied.
Review upstream compatible fixes when updating the lockfile. These tools process
repository source during development, not user projects at runtime.

## Final local acceptance — 2026-11-20

On Node 26.13.0/macOS: clean `npm ci`, typecheck, ESLint/TSDoc, Prettier check,
19 Vitest tests, build and Markdown lint all passed. The packed tarball installed
into an isolated temporary prefix; its actual `kairn` bin passed help, version,
first init and repeated init. A real pseudo-terminal verified Ctrl+C exit 2 with
no writes, and affirmative create confirmation with exit 0. NO_COLOR removed
styling colors; interactive cursor controls remain necessary for Clack prompts.
CI coverage on other operating systems must be judged from actual workflow runs.

### Windows checkout correction

The first remote run passed Linux/macOS but failed Windows Prettier because Git
checked out CRLF while the formatter requires LF. `.gitattributes` now enforces
LF for text on every platform, including executable shebangs. The format gate is
unchanged. Subsequent remote runs verify the correction.

## Phase 2 document engine

`tests/documents.test.ts` uses temporary roots for nested discovery, stable IDs,
canonical paths, empty roots, fresh edits/deletes, ignored hidden/non-Markdown
entries, traversal/unknown IDs, invalid roots, root/descendant symlinks and parent
replacement. Lower limits exercise entry/count/depth/read caps. POSIX-only
permission tests skip Windows and root, matching existing init tests.

## Phase 2 HTTP coverage

Ephemeral loopback tests cover health/tree/read, missing/invalid IDs, raw and
encoded traversal, absolute paths, hostile Host/Origin/Fetch Metadata, GET-only
and body rejection, header/URL bounds, port conflicts, generic internal errors,
and idempotent/bounded shutdown. Every fixture closes its server in cleanup.

## Phase 2 viewer coverage

DOM tests with jsdom verify nested navigation, relative document links, current
selection, root README preference, empty/error states and stale bookmarks.
Parser tests cover headings/lists/tables/fences/links, HTML escaping, script/data/
file/protocol-relative URL rejection and image suppression. Local HTTP tests
verify compiled assets, CSP and HTML generated from actual Markdown source.

## Phase 2 CLI coverage

`tests/run.test.ts` covers read-only startup/abort, browser suppression and failure,
missing docs/non-TTY guidance, root-selection cancellation, alternate roots,
pre-aborted startup and command flags. Built subprocess tests read nested Markdown
through the real API and terminate without a remaining listener. POSIX signals
verify graceful exit; Windows process termination is verified as forced cleanup
because Node's child.kill does not deliver a catchable SIGINT there. Existing
init tests remain unchanged except replacing run as the unknown-command fixture.

## Phase 2 final acceptance — 2026-11-20

On Node 26.13.0/macOS: clean npm ci and all six quality scripts passed; final
regression suite has 51 tests. Added checks cover selected-root replacement,
file-symlink replacement, pending loading state and hostile filename labels.
Windows skips POSIX permission/file-symlink tests; directory junction and HTTP/DOM
coverage still run. GitHub Actions retains the existing three-platform matrix.

The packed CLI installed into a clean temporary global prefix and passed help,
version and self-documentation viewing. Port 4173 was occupied, so the exact
`kairn run --no-open` invocation verified the conflict error; `--port 0` then
served the repository's real docs. A real browser verified sidebar selection,
headings and table rendering. Ctrl+C exited 0, the listener closed, and hashes
of all nine source docs matched the pre-run snapshot. No browser auto-launch
occurs in tests and no Kairn listener remains. Runtime npm audit reports zero
advisories; the eight previously documented development-tool advisories remain.

### Remote verification

The [feature-branch CI run](https://github.com/Shubhdeepdsa/kairn/actions/runs/44716122814)
at `3633546` passed all required gates on Linux, macOS and Windows. The separate
[PR checks](https://github.com/Shubhdeepdsa/kairn/pull/1/checks) track integration
with main. PR #1 has been merged.

## Automatic navigation refresh

The local suite passes 57 tests. New temporary-filesystem/API tests verify live
additions, nested paths, stable IDs, rename/deletion, excluded dotfiles, shared
concurrent scans, rejection of replacement roots, retained snapshots on unsafe/
oversized rescans and recovery. Fake-clock DOM tests verify automatic sidebar
updates, unchanged active content, preserved selection/collapsed folders, empty
root recovery, deleted selection fallback, retry, hidden-tab pause and cleanup.
No arbitrary delays or operating-system watcher dependency are used.

## Phase 3 persistence

`config-storage.test.ts` exercises schemas, traversal/version failures, corrupt
file preservation, isolated OS paths, repeated/concurrent saves, stale values,
lock conflicts and failed-validation cleanup. No test touches real application data.

Library tests use independent service instances over temporary data to verify
persistence, duplicate registration, rename identity, safe unregister, unavailable
roots, invalid roots/names and stale override previews.

Project-config fixtures cover absent defaults, candidate discovery, decline,
create-only conflicts, portable copied roots, explicit override deltas, primary
selection and missing-source diagnosis without rewriting configuration.

Source tests cover AGENTS/drafts/generated globs, zero-directory **, case behavior,
unsupported syntax and overlap reports. Discovery/config tests remain read-only.

Multi-document tests verify primary unwrapping, multiple roots, identical titles,
explicit hidden-directory files, canonical deduplication, external sources, ignore
deltas, stable refresh IDs and missing-file removal without absolute-path leakage.

`project-cli.test.ts` verifies canceled/noninteractive mutations, fresh-process
Library state, add/rename/source/ignore/config commands, project-ID viewing from
an unrelated cwd, all three source types via real HTTP, absolute-path redaction,
source removal and unregister preserving shared config and document bytes.

## Phase 3 local acceptance — 2026-11-20

Node 26.13.0/macOS: clean npm ci, typecheck, lint, format check, 79 tests, build
and Markdown lint passed. Existing init, single-root run, safe rendering, automatic
navigation refresh, loopback security and signal cleanup regressions still pass.
Additional acceptance covers a real child-process writer lock, config symlinks,
shared duplicates, stale metadata previews, missing-source repair and cross-source
links with duplicate display titles. Tests redirect every Library access to temp data.

The packed executable installed into a clean temporary prefix and passed help,
version, fresh-process registration, three directory/file sources (including an
explicit .github file), portable config creation, run by ID from unrelated cwd,
real HTTP HTML/tree reads, graceful SIGINT and unregister with document/config
hashes unchanged. All servers/processes were closed. Runtime audit: zero advisories;
eight pre-existing dev-tool advisories remain. Remote OS results must be verified
from the feature PR, not inferred from local execution.

Windows overlap checks also distinguish sources on separate drive letters; a
cross-drive absolute relative() result cannot imply directory containment.

Phase 3 [push CI](https://github.com/Shubhdeepdsa/kairn/actions/runs/44726328194)
and [PR CI](https://github.com/Shubhdeepdsa/kairn/actions/runs/44726417025) passed
Linux, macOS and Windows at `f0570f0`. PR #2 is merged; see latest checks for
follow-up commits. No npm publication or automatic merge.

Phase 4 content tests verify real external saves, conditional 304 responses,
unchanged DOM, focus preservation, retry and last-render retention on read failure.

Live-project fixtures verify personal source/ignore/primary edits, shared JSON
failure and recovery/deletion, missing paths, concurrent refresh sharing and
registration loss retaining the last valid reader with a redacted warning.

Core link fixtures verify same/cross-source links, explicit hidden-directory files,
encoded spaces/Unicode, repeated headings, missing fragments, exclusions, missing/
unregistered destinations and unsafe formats. No external URLs are fetched.

Diagnostics tests verify deduplication, missing targets, external URLs left alone,
and the explicit 32-link bound. HTTP never serializes internal canonical identity.

Navigation tests cover deep-link round trips/Unicode/malformed fragments, URL
restoration and history events, out-of-order reads, background anchor/scroll
preservation and clickable core diagnostics without replacing the active article.

Reader tests cover the accessible outline, deterministic heading order and
shareable outline links. CSS limits code/table width and preserves visible focus.
Copy-code and syntax highlighting remain deferred rather than adding dependencies.

## Phase 4 final local acceptance — 2026-11-20

Node 26.13.0/macOS: clean npm ci, typecheck, lint, format check, 95 tests, build
and Markdown lint passed. Existing Phase 1–3 init/project/persistence/source/ignore/
HTTP/Markdown/refresh/cancellation/signal regressions remain covered.

`reader-acceptance.test.ts` starts the actual compiled run command, mounts the DOM
reader against its real HTTP API, and edits files/settings using separate CLI
processes. It verifies live content without page reload or selection change,
source additions, cross-source heading links, ignore add/remove, invalid shared
JSON retaining valid content, recovery and clean shutdown. Focus, scroll/anchor,
actual Back/Forward events and stale-request protection have separate DOM tests.

A clean temporary-prefix install of the packed executable passed help/version,
conditional 304, external content edits, live CLI source/ignore changes, core
heading resolution, invalid config preservation/recovery and packaged navigation
module serving. All acceptance listeners/processes were closed; no real Library or
unrelated project data was used. Runtime audit reports zero advisories; existing
eight development-tool advisories remain.

Browser inventory reports local browser use disabled in Work settings. These are
API/DOM and installed-binary checks, not manual real-browser verification. Remote
Linux/macOS/Windows results must be reported from the feature PR checks.

Phase 4 [push CI](https://github.com/Shubhdeepdsa/kairn/actions/runs/44732707496)
passed all Linux/macOS/Windows jobs at `82ff53e`. [PR #3 checks](https://github.com/Shubhdeepdsa/kairn/pull/3/checks)
track the integration/latest-head results. No manual browser check is inferred from CI.

A final duplicate-link regression ensures repeated occurrences do not consume the
unique-link analysis budget and hide later broken targets. Final suite: 96 tests.

## Phase 5 extraction

`search-contracts.test.ts` validates opaque scope identities. Search extraction tests
exercise repeated Unicode headings, lists/tables/code, technical identifiers,
raw-HTML omission and exact reader-fragment compatibility without a database.

`search-index.test.ts` uses real temporary SQLite databases: technical tokens,
persistence, incremental section replacement, pruning, private permissions, schema
rebuild, offline corruption, competing connections, rollback and a 250-document
index/query timing sample. The same test runs in the existing three-OS CI matrix.

`search-query.test.ts` fixes title/heading/path/body/code ranking order, long-body
competition, best-section grouping, duplicate names/IDs across scopes, seven
technical queries, hostile FTS expressions and query/result bounds.

`search-coordinator.test.ts` uses real registered projects to verify global/current
scope, duplicate names, live edits/deletions, source/primary/ignore changes,
unavailable roots, unregister preservation and transient isolation. A compiled-worker
integration verifies coalescing and clean close independently of HTTP and the UI.

`project-navigation.test.ts` verifies approved cross-project identities, duplicate
labels, heading validation, old/new bookmarks, real scoped HTTP reads, redaction,
strict search parameters and removed/invalid project refusal without a palette.

`search-palette.test.ts` uses fake timers to verify contextual/global opening,
composition-safe Backspace, cursor-aware selector removal, query preservation,
duplicate names, Escape precedence, debounce, scope changes and stale replies.

`search-palette-dom.test.ts` verifies real DOM keyboard events, contextual/global
scope, composition, @ completion and query preservation, safe result text, accessible
selection, focus restoration, partial/error states, refresh and aborted cleanup.
These are DOM tests; they are not claims of human browser acceptance.

## Phase 5 acceptance

`search-acceptance.test.ts` packs the actual executable, installs offline into a
clean temporary prefix and starts it with isolated Library/projects. It verifies
three-project scopes, technical terms, actual API plus DOM palette selection,
cross-project Back/Forward/deep links, explicit fresh indexing, ignore/source
changes, unavailable/unregistered projects, offline cache-corruption restart and
unregistered local search. It preserves original bytes except deliberate fixture
edits and shuts down all processes. No real Library/project is used.

`search-processes.test.ts` verifies independent process writers and recovery after
a process exits during an uncommitted transaction. Section/heading and materialized
query payload bounds are additional acceptance safeguards. Run performance samples
with `npm run build` then `node scripts/benchmark-search.mjs`; it creates/removes
its own isolated fixtures. See SEARCH_ACCEPTANCE.md for actual local measurements
and the separate human-browser checklist.

## Phase 5 local verification — 2026-11-20

Node 26.13.0/macOS: clean npm ci, typecheck, lint/TSDoc, format check, build,
Markdown lint and 117 tests across 28 files passed. This includes the clean-installed
package, real process/SQLite rollback/concurrency, actual HTTP and DOM navigation
acceptance described above. Runtime audit: zero advisories; npm ci still reports
eight existing development-tool advisories. Dependencies/lockfile were unchanged.
Real human browser acceptance remains blocked by the browser tool setting. Remote
Linux/macOS/Windows results are not inferred from the local run; see feature CI.

The first Phase 5 remote run exposed test-harness assumptions: fresh npm-ci caches
contain tarballs without registry packuments, and Windows FULL-sync benchmark writes
exceeded Vitest's default five-second timeout. Clean-package acceptance now creates
a temporary lock from the committed dependency graph plus the actual packed tarball
and runs offline npm ci; it does not depend on cached registry metadata or alter the
repository lock. The unchanged 250-document SQLite benchmark has an explicit 30-second
timeout, not a performance assertion. No product assertions or safety checks were removed.

A partial-coverage regression verifies that a 513-section fixture is omitted and
reports zero indexed out of one total document, rather than counting attempted
reads as successful indexing. Final suite includes this additional coverage case.

## Phase 5 remote verification

At `bb0c260`, [PR Quality run](https://github.com/Shubhdeepdsa/kairn/actions/runs/44794623663)
passed all Linux, macOS and Windows jobs, including clean install, typecheck,
lint/TSDoc, formatting, real SQLite/process/installed-package tests, build and
Markdown lint. Final local suite: 118 passed across 28 files. Windows: 115 passed
and three existing platform-specific permission/symlink skips (no new search skips).
This verifies built-in FTS5, locking, rollback, recovery and installed navigation
on all three OS runners. It does not establish identical OS performance or human
browser acceptance. PR #4 remains open and unmerged.

A repeated CI run exposed bounded-work assumptions: global installed acceptance now
advances indexing responses for at most 12 requests before requiring the full result
identity set. A deterministic one-document-budget regression proves three-project
forced refresh converges over three jobs without restarting completed projects.
Independent process tests accept only the documented temporary SQLite lock error,
then explicitly retry after both competing processes exit and require both records
plus crash rollback. The unchanged 250-document FULL-sync benchmark has a 90-second
safety timeout because runner storage varied beyond 30 seconds; timings remain
observations, not latency assertions. No corpus, result, durability or rollback
assertion was removed.

A two-coordinator regression models a late obsolete writer after an ignore change.
Schema-v2 approval hashes keep that row out of the newer coordinator's cached results,
then the older coordinator reconciles current rules. This verifies scope safety
across processes independently of query freshness and content revision.

After bounded-resume and approval-fence corrections, the final local suite passes
120 tests across 28 files. Latest-head remote evidence is tracked on
[PR #4 checks](https://github.com/Shubhdeepdsa/kairn/pull/4/checks); the earlier
118-test run at bb0c260 above is historical evidence, not a substitute for that check.

Empty-palette regressions cover Enter dismissal without search requests, automatic
global project rows, arrow/Enter and selector-only navigation intents, preserved
query-based scoping, and actual DOM reader/project-chip/URL changes. Selecting an
empty project preserves the prior reader and reports the missing document state.

The empty-palette/project-switch follow-up passes the full 123-test local suite,
including installed-package search/navigation regressions. Real-browser interaction
is separate from the DOM checks and is not claimed by these results.

Late project metadata clamps selection only while project rows are visible; it
cannot unexpectedly move the highlighted documentation result.

Active-project reselection regressions cover both the global project list and a
selector-only query from a nondefault document, preserving DOM identity, URL,
history and reading position without another navigation request.

Worker recovery regressions terminate a real worker with an outstanding request
and inject an error before its later exit. They verify rejection, lazy replacement,
duplicate-request coalescing and successful subsequent searches with isolated data.

After these review fixes, the full local suite passes 127 tests in 28 files.
Typecheck, lint/TSDoc, formatting, build and Markdown checks also pass.

## Post-merge Windows bounded-indexing regression

The Phase 5 merge run failed a coordinator assertion that expected two projects
from one cold search request. Windows returned one result before the bounded job
finished; compilation and the other operating systems passed.
The reconciliation fixture now explicitly advances at most 12 refresh jobs until
coverage is no longer indexing, then retains the full result identity, freshness,
ignore/source, unavailable-project and unregistration assertions. It runs with both
the production 200-document cap and a one-document cap to force multiple jobs
without sleeps or slower-runner timing assumptions. Production budgets are unchanged.

Local verification of this correction: all six quality gates pass, with 128 tests
in 28 files. Windows verification is tracked by the fix PR CI, separately from
these macOS results.

## Phase 6A build foundation

Browser TSX has a separate strict no-emit TypeScript program. Vitest now includes
React Testing Library/jsdom tests for initialization and redacted root render
errors. Node production compilation excludes frontend sources; Vite builds them
into dist/frontend. Browser smoke tests are added in the acceptance stage.

Packaged-asset/API regression checks pass (20 tests across asset/server/run files).
They cover direct app routes, unknown assets/APIs, request protections, legacy
reader serving, file/count bounds and package symlink rejection where supported.

Shared UI tests cover Button defaults/refs/variants/loading/disabled behavior,
semantic icon resolution and accessible labeling, plus theme root cleanup.

Typed-client tests exercise fixed URLs/options, malformed IDs/payloads, transport
errors, HTTP redaction and cancellation. Provider tests cover loading/retry and
obsolete-response cleanup when integrated with the routed shell.

Routed React tests verify one header/main region across pages, shared sidebar
disclosure in global/workspace/project layouts, identity validation, legacy URL
handoffs and startup loading/error/retry/abort behavior. Pure bookmark helpers
are extracted unchanged so the browser program never type-imports Node services.

Architecture tests traverse every browser import (including type imports), reject
Node/adapters except the three named pure contracts/controllers, detect cycles,
check shared token consumption and exercise ESLint rejection fixtures. Lint enforces
Hooks, shared Button/Icon and no inline styles; architecture checks also reject
feature color literals and raw fetch outside the API boundary.

## React installed-browser smoke

`npm run test:browser` runs Playwright Chromium against a packed, offline-installed
CLI in a disposable canonical temporary directory with isolated Library data.
Install its browser first using `npx playwright install chromium` (CI installs OS
prerequisites too). It shares the existing deterministic package-install fixture
with search acceptance. No Vite server or development packages are present in the
installed prefix. Tests check React initialization, direct nested routes, reload,
Back/Forward, unknown routes, local-only requests, clean console, token application,
legacy bookmark/search dismissal and real content refresh. All three CI runners
execute this smoke suite after the existing gates. Tools/browser tests have their
own TypeScript no-emit program. Fixtures clean up CLI processes and temp files.

Local Phase 6A acceptance: 149 Vitest tests in 34 files pass, plus the real
Playwright Chromium installed-package smoke. Existing Phase 1–5 assertions remain.
The baseline workspace has unrelated untracked designs/ and temp.md that fail
format/docs checks; clean tracked-tree verification and CI are reported separately.
Bundle/package/browser measurements are in [frontend architecture](FRONTEND.md).

Clean-export verification caught a test-only dependency on pre-existing dist type
declarations. The asset test now dynamically loads compiled presentation code
with a source contract type, matching the existing worker tests; typecheck can run
before the first build on a fresh checkout.

A clean archive (without user notes or pre-existing dist) passes npm ci and every
required quality gate, 149 tests and the real installed-package Chromium smoke.
Production audit reports zero advisories; eight development-tool advisories remain
from the baseline. CI evidence is recorded on the Phase 6A PR.

The custom-SVG replacement regression swaps a Lucide registry entry for a typed
custom SVG and verifies unchanged consumer names, token classes, currentColor,
focus behavior and decorative/meaningful accessibility. The original entry is
restored during cleanup; no runtime registry override API or empty directory is
added. The follow-up passes the full 150-test local suite, typecheck, lint and build.
