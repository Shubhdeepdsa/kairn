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
