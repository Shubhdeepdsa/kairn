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
with main. PR #1 remains unmerged for review.
