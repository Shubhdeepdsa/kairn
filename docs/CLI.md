# Kairn CLI contract

Implemented: `kairn --help` (`-h`), `--version` (`-v`), and
`kairn init [--cwd <directory>] [--yes]`, and `kairn run`.

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

## Local viewer

```sh
kairn run
kairn run --cwd ./my-project
kairn run --port 4173
kairn run --no-open
```

Run prefers the selected project's existing direct `docs/`. It never calls init
or creates files. When docs are missing, an interactive terminal may supply an
existing documentation directory (relative to the project, or absolute) or cancel
with code 2. Noninteractive use fails with guidance; invalid/symlink docs fail.

The server binds only `127.0.0.1`, default port 4173. `--port` accepts integers
0–65535; 0 chooses an available port. Port conflicts suggest choosing another
port. `--port`/`--no-open` are run-only; `--yes` is init-only. Help/version remain
available. Errors exit 1; clean SIGINT/SIGTERM shutdown exits 0.

The URL is always printed. Interactive desktop sessions open the default browser
unless `--no-open` is set. CI/non-TTY and Linux sessions without DISPLAY or
WAYLAND_DISPLAY skip browser launch with guidance. Browser-open failure leaves
the viewer available and prints a manual-open instruction. Ctrl+C stops the server.

Navigation is a startup snapshot; restart to discover added/renamed files. Existing
files are reread when selected. Hidden files, symlinks, attachments and remote
images are not served. The viewer has no editing, search, Git history or registry.
