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

Navigation refreshes automatically about every two seconds while the tab is
visible, and immediately when returning to the tab. Added/renamed/deleted Markdown
files update the sidebar without restarting or reloading. Existing content is
checked during the same polling cycle; changed active content refreshes without
reselection, while unchanged content keeps its DOM and focus. Hidden files, symlinks, attachments and remote
images are not served. The viewer has no editing, search, Git history or registry.

The current selection and collapsed folders survive sidebar updates. If the active
file disappears, the viewer selects README.md or the first remaining document;
an empty tree displays guidance and continues checking for files. Refresh errors
are shown and retried, keeping the last valid sidebar. Dotfiles remain excluded.

## Persistent projects (Phase 3)

```sh
kairn project add --cwd ./my-project --name "My project" --yes
kairn project list
kairn project show <id>
kairn project rename <id> --name "New name" --yes
kairn project remove <id> --yes
kairn project sources discover <id>
kairn project sources list <id>
kairn project sources add <id> --path README.md --yes
kairn project sources add <id> --path .github/DEPLOYMENT.md --yes
kairn project sources remove <id> --path README.md --yes
kairn project sources primary <id> --path docs --yes
kairn project ignore add <id> --pattern '**/AGENTS.md' --yes
kairn project ignore remove <id> --pattern '**/AGENTS.md' --yes
kairn project ignore restore <id> --pattern '**/AGENTS.md' --yes
kairn project config init <id> --yes
kairn run --project <id> --no-open
```

IDs are printed by add/list and survive rename. Commands print a preview before
persisting; --yes explicitly approves, otherwise interactive Clack confirmation
is required. Missing IDs/names/paths/patterns may be prompted for in a TTY.
Cancel exits 2 without writing; invalid input/conflicts exit 1. List/show are
machine-readable JSON; absolute paths there are CLI-only, never HTTP output.
Remove unregisters metadata only. Config init is explicitly approved, create-only
and refuses external paths. Personal source changes and ignore rules stay in the
Library; shared configuration is not edited by these commands. Restart run after
configuration changes; document files themselves still refresh automatically.

Run with no flags still works without registration. If the selected canonical
root is registered, run resolves its shared config and personal overrides.
`--project` selects a registered ID from any directory and cannot combine with
`--cwd`. Run never registers or writes configuration. See [configuration](CONFIGURATION.md)
for schema, storage locations and precedence. Source discover returns candidates
only; source add is the approval operation.
