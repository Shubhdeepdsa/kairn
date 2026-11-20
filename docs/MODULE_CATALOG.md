# Reusable module catalog

All core exports live in `src/core/initialization.ts` and are tested in
`tests/core.test.ts`.

| Export                      | Contract                                                              |
| --------------------------- | --------------------------------------------------------------------- |
| `discoverDocumentationRoot` | Read-only direct-child discovery; null if absent; rejects links/files |
| `planInitialization`        | Read-only canonical root, identity and create/reuse snapshot          |
| `applyInitializationPlan`   | Explicit approval; revalidate snapshot; mkdir only; never overwrite   |
| `InitializationPlan`        | Readonly root/action/device/inode snapshot                            |
| `InitializationResult`      | Actual created/reused/declined outcome                                |

CLI adapters consume this module; it has no prompts, process exits or network.

CLI boundary exports: `runInit`, `InitContext`, and `InitPrompts` in
`src/cli/init.ts`; `clackPrompts` in `src/cli/prompts.ts`. These are terminal
adapters, not core APIs. `tests/cli.test.ts` verifies consent and cancellation
with fake prompts plus built-binary subprocess checks.

## Read-only documents

`src/core/documents.ts`: `createDocumentService(directory, limits?)` returns a
`DocumentService` with canonical `root`, immutable `tree`, and `read(id)`.
`DocumentEntry`, `DirectoryEntry`, `NavigationEntry`, and `DocumentContent` define
navigation/content. Absolute `canonicalPath` stays local; adapters must omit it.
`DocumentError`/`DocumentErrorCode` expose stable failures. `DocumentLimits` and
`documentLimits` define hard caps; callers can lower them. Covered by
`tests/documents.test.ts`: nesting, ordering, identities, read-only behavior,
fresh reads, paths, symlinks, permissions and limits.

## HTTP adapter

`src/server/http.ts`: `startDocumentationServer` consumes only `tree/read` from
`DocumentService`, returning `RunningServer` (`url`, idempotent `close`).
`ServerOptions` permits port 0 for tests and optional `ViewerPresentation` static
assets/rendering. It never resolves request paths against the filesystem.
`tests/server.test.ts` covers protocol, isolation, lifecycle and port conflicts.

## Minimal viewer

- `src/viewer/markdown.ts`: `renderMarkdown` uses markdown-it (native types),
  escapes raw HTML, permits only relative/http/https/mailto links, and replaces
  images with text. Headings receive deterministic fragment IDs.
- `src/viewer/client.ts`: `mountViewer` renders navigation from the API, selects
  documents by opaque ID, handles relative Markdown links within the root and
  shows loading/error/empty states. Fetch is injectable for DOM tests.
- `src/viewer/assets.ts`: `loadViewerPresentation` loads the packaged compiled
  client and provides the shell, responsive CSS and renderer for HTTP composition.

`tests/viewer.test.ts` covers parser safety/features, DOM navigation/state and
actual served assets/API HTML. No framework or browser build pipeline is needed.
