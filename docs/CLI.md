# Kairn CLI contract

**Status: PLANNED until implemented and tested.** This page defines initial intended behavior, not a claim of a working binary.

## Commands

| Command | Intended behavior | v0 status |
| --- | --- | --- |
| `kairn --help` | List real commands and quick start | Planned |
| `kairn --version` | Display package version | Planned |
| `kairn init` | Interactive documentation initialization in current directory | Planned |
| `kairn init --yes` | Explicit non-interactive safe default; never clobber existing files | Planned |
| `kairn run` | Start local document viewer | **Later; do not implement or advertise as working** |

## Init intent

1. Detect an existing direct child `docs/`; do not recurse arbitrarily.
2. If it exists, offer to use/preserve it. Do **not** overwrite existing Markdown.
3. If missing, offer to create `docs/` with minimal optional starter content (such as `README.md`).
4. Show planned writes and ask for confirmation in interactive mode.
5. Allow cancel at every prompt; canceled operations must leave the filesystem unchanged.
6. On completion, report precisely which files were created and a sensible next action.
7. Non-interactive environments require explicit flags; never hang waiting for stdin.

`init` doesn't have to register a global Kairn project yet, contact GitHub, create commits or run a server. All these behaviors are separate later milestones.

## Accessibility and error handling

Use clear prompts and controls; handle `NO_COLOR`, limited terminals and keyboard cancellation. Errors should explain path permissions, conflicts and missing directories. No ANSI-only distinctions.

Once implemented, update this document with exact verified flags, exit codes, examples and check results.

## Phase A implementation

`--help` (`-h`) and `--version` (`-v`) are implemented. Unknown arguments exit 1.
Initialization remains planned. The executable is `dist/index.js` after building.
