# Kairn

Local-first Markdown documentation CLI. Includes safe interactive initialization and a read-only localhost Markdown
viewer. Git history and the final React interface remain planned.

## Install from source

Requires Node.js 26 and npm. This package is not published to the npm registry.

```sh
npm ci
npm run build
npm install --global .
kairn --help
kairn --version
```

From any project directory, run `kairn init`. The Clack wizard previews creation of
an empty `docs/` or reuse of existing documentation, then asks for confirmation.
Existing files are preserved. Canceling makes no changes.

```sh
kairn init --cwd ./my-project --yes
```

Use `--yes` for explicit noninteractive approval. Without it, non-TTY/CI use fails
without prompting. See [command contracts and exit codes](docs/CLI.md).

## Read documentation

```sh
kairn run
kairn run --cwd ./my-project --port 4173 --no-open
```

Run reads the project's existing `docs/`, including nested Markdown, and prints
its `http://127.0.0.1` URL. The browser opens in interactive desktop sessions;
`--no-open` and headless sessions leave opening it to you. Ctrl+C stops the server.
Run never creates documentation. If docs are missing, a terminal can prompt for
another existing root. See [CLI behavior](docs/CLI.md) and
[security assumptions](docs/ARCHITECTURE.md).

The prototype supports headings, tables, lists, code blocks and document links.
Raw HTML is escaped and images are shown as text; no remote assets are loaded.
The sidebar picks up new, renamed and deleted Markdown files automatically
about every two seconds while the tab is visible. Existing content is reread on
selection and automatically while displayed. Unchanged content is not re-rendered.
Dotfiles and hidden directories remain excluded.

## Development

Run `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`,
`npm run build`, and `npm run docs:lint`. Tests build the binary automatically.

See [documentation](docs/README.md), [contributing](CONTRIBUTING.md) and
[security](SECURITY.md). Licensed under [MIT](LICENSE).

The final React UI, Git history, editing, search, AI and cloud
services are outside this milestone. No telemetry or external runtime requests.

## Remember projects and add documentation sources

```sh
kairn project add --cwd ./my-project --name "My project" --yes
kairn project list
kairn project sources add <id> --path README.md --yes
kairn project sources add <id> --path .github/DEPLOYMENT.md --yes
kairn run --project <id>
```

Use the ID printed by add/list. The machine-local Library remembers projects;
`project config init <id>` explicitly creates optional shareable configuration.
[CLI commands](docs/CLI.md) cover rename/unregister, source management and basic
ignore rules. [Configuration](docs/CONFIGURATION.md) defines precedence and JSON.
No project configuration is created just by running the viewer.

## Live reading

Source/ignore configuration and active Markdown content reload while the viewer
runs. Invalid settings retain the last valid view with a warning and recover after
correction. Local links resolve only to approved documents and show diagnostics
for missing/excluded destinations or headings. Document/heading bookmarks,
Back/Forward and a simple heading outline support longer reading sessions.
See [reading contracts](docs/READING.md) for behavior, API and limits.
