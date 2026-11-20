# Kairn CLI contract

Implemented: `kairn --help` (`-h`), `--version` (`-v`), and
`kairn init [--cwd <directory>] [--yes]`. No other commands are supported.

## Initialization

Default target is the current directory. `--cwd` accepts an existing directory,
including paths containing spaces. No Git repository or package file is required.
Only the direct `docs/` child is inspected; no recursive scan is performed.

The wizard shows the canonical project directory and preview, offers create/reuse
or cancel, then asks for final confirmation (default no). Creation adds an empty
`docs/`; reuse writes nothing and preserves all existing content. Canceling any
prompt, including Ctrl+C, makes no changes. No global configuration is written.

`--yes` explicitly approves the same safe default without prompts. Without it,
non-TTY, CI and dumb terminals fail with actionable instructions. Plain output is
used for `--yes`; Clack uses Node terminal styling and respects `NO_COLOR`.
Filesystem roots, selected-root symlinks, docs symlinks and file conflicts fail.

## Exit codes

| Code | Meaning                                                                           |
| ---- | --------------------------------------------------------------------------------- |
| 0    | Success or help/version                                                           |
| 1    | Invalid arguments, inaccessible path, conflict, or noninteractive use without yes |
| 2    | Interactive cancellation or declined confirmation                                 |

## Examples

```sh
kairn init
kairn init --cwd ./my-project --yes
```

`init` never registers projects, contacts a service, changes Git, installs packages,
or starts a server. Add Markdown files yourself after initialization.
