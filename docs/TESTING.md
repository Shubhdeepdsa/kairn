# Verification and quality strategy

**Status: PLANNED until scripts and tests are implemented.**

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
subprocess help/version checks; tests use Node's native TypeScript support.
ESLint validates TypeScript and TSDoc syntax. Prettier and markdownlint check
repository documentation as well as source. Line length and table alignment
Markdown rules are disabled to permit readable prose and Prettier tables.

## Core coverage

Temporary fixtures verify read-only plans, consent/decline, creation without Git,
byte-preserving reuse, repeat runs, direct-child-only detection, missing roots,
file conflicts, root/docs symlinks, stale plans and unreadable roots. Permission
checks skip on Windows and privileged users, where POSIX mode bits are unreliable.
Concurrent hostile ancestor replacement is outside the supported threat model.
