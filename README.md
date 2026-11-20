# Kairn

Local-first Markdown documentation CLI. The initial milestone implements safe
interactive initialization; the document viewer and Git explorer are planned.

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

## Development

Run `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`,
`npm run build`, and `npm run docs:lint`. Tests build the binary automatically.

See [documentation](docs/README.md), [contributing](CONTRIBUTING.md) and
[security](SECURITY.md). Licensed under [MIT](LICENSE).

`kairn run`, a browser UI, project registry, Git history, AI and network services
are outside this milestone. No telemetry or runtime network access.
