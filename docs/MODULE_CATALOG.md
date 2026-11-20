# Reusable module catalog

Initialization exports live in `src/core/initialization.ts` and are tested in
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
`DocumentService` with canonical `root`, immutable `tree` snapshots, `read(id)`,
and coalesced `refresh()` that atomically updates navigation and IDs. Failed
rescans preserve the last valid snapshot; the original root identity is pinned.
`DocumentEntry`, `DirectoryEntry`, `NavigationEntry`, and `DocumentContent` define
navigation/content. Absolute `canonicalPath` stays local; adapters must omit it.
`DocumentError`/`DocumentErrorCode` expose stable failures. `DocumentLimits` and
`documentLimits` define hard caps; callers can lower them. Covered by
`tests/documents.test.ts`: nesting, ordering, identities, read-only behavior,
fresh reads, paths, symlinks, permissions and limits.

## HTTP adapter

`src/server/http.ts`: `startDocumentationServer` consumes `tree/read` and optional `refresh` from
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
  shows loading/error/empty states. Navigation polls every two seconds while
  visible; the returned cleanup function stops timers/listeners. Fetch is
  injectable for DOM tests.
- `src/viewer/assets.ts`: `loadViewerPresentation` loads the packaged compiled
  client and provides the shell, responsive CSS and renderer for HTTP composition.

`tests/viewer.test.ts` covers parser safety/features, DOM navigation/state and
actual served assets/API HTML. No framework or browser build pipeline is needed.

## Run workflow

`src/cli/run.ts`: `runDocumentation(RunContext)` composes existing docs discovery,
the document service and HTTP adapter. `RunContext` injects prompts, browser open,
presentation, logging and abort lifetime. It does not own filesystem algorithms.
`src/index.ts` owns argument validation, Clack adaptation, browser eligibility,
packaged viewer loading and SIGINT/SIGTERM listener cleanup.

## Versioned configuration storage

`core/config/schema.ts`: strict `projectSchema`, `librarySchema`,
`overridesSchema`, `relativePathSchema`, inferred domain types, `ConfigError` and
`validateConfig`. `core/config/storage.ts`: `applicationDataDirectory`,
`assertRealPath`, `isMissing`, bounded `readJson` and serialized/locked `updateJson`.
Storage is explicit and injectable; no singleton or browser access.

## Project Library

`core/library.ts`: `canonicalProjectRoot` validates canonical directory identity;
`ProjectLibrary` offers snapshot/list/get/find/register/rename/unregister,
setOverrides and availability. Constructor accepts an explicit data directory.
UUID identity survives rename; unavailable roots remain registered. Mutations
use locked revision-checked JSON storage; unregister never deletes project files.

`core/config/project.ts`: `loadProjectConfig`, approved create-only
`createProjectConfig`, direct `discoverSourceCandidates`, and write-free
`resolveProjectConfig` return `ResolvedProject`/`ResolvedSource`. Relative portable
paths remain separate from canonical internal paths. Personal fields have explicit
merge semantics; see CONFIGURATION.md. Source candidates require approval to save.

`core/sources.ts`: `compileExclusions` compiles the deliberately limited glob
syntax; `sourceOverlaps` reports root overlap without modifying declarations.
`discoverSourceCandidates` only suggests direct docs and root README. Explicit
files in hidden directories are approved sources, not recursive discovery.

`core/documents.ts`: `createProjectDocumentService(ResolvedProject)` reuses the
existing scanner/read safeguards for directory and individual-file sources.
`DocumentEntry.sourceId/projectPath` preserve source and project provenance while
canonical paths stay internal. Aggregate scan/document limits span sources;
primary-first deduplication uses canonical file paths. Refresh retains IDs and
skips disappeared sources without deleting configuration.

`core/application.ts`: `resolveRunProject` composes Library lookup and shared/
personal resolution without writes. `cli/project.ts`: `runProjectCommand`,
`ProjectPrompts`, `projectPrompts` adapt preview/consent and scriptable arguments
to core operations. No HTTP Library/settings mutation endpoints are introduced.

`core/freshness.ts`: `documentRevision` hashes only the bounded active document.
HTTP document responses expose revision/ETag and honor If-None-Match with 304.
The viewer reuses its visible-tab loop for background content reads and leaves
unchanged article DOM/focus intact; failures retain content and retry next cycle.

`core/live-project.ts`: `createReloadingDocumentService` composes the existing
resolver/scanner, fingerprints effective settings, coalesces refreshes and swaps
only complete validated services. Optional `DocumentService.warning` surfaces a
redacted reload warning while preserving last valid state. No settings are written.

`core/markdown.ts` now owns the existing safe parser/slug algorithm and exports
`analyzeMarkdown`, `MarkdownAnalysis`, `Heading`, and `renderMarkdown`; the old
viewer module re-exports rendering for compatibility. `core/document-links.ts`
exports `resolveDocumentLink` and browser-safe typed results/diagnostics. Internal
`DocumentService.linkTargets/classifyLinkTarget` expose canonical authority only
to core; HTTP never serializes those paths. Resolution checks only effective IDs.

`core/link-diagnostics.ts`: `diagnoseDocumentLinks` checks at most 32 unique parsed
links for the active document, with an explicit cap diagnostic and no remote
requests. `server/contracts.ts` defines browser-safe `DocumentResponse` including
revision, headings and diagnostics. The POC shows concise current-document warnings.

`viewer/navigation.ts`: `ReaderLocation`, `parseReaderLocation`, and `readerHash`
implement `#id[/encoded-heading]` URL state. User actions push history, initial/
fallback choices replace it, and popstate/hashchange restore without pushing.
Local link clicks call core resolution; no browser filesystem-path inference.
Default docs entries retain legacy relative-path bookmark aliases when unambiguous.

The reader presents the reusable `Heading` outline as keyboard-accessible links
with shareable heading URLs. Code blocks/tables stay horizontally scrollable
within the article; inline code is visually distinct. No syntax highlighter,
clipboard dependency, final design system or additional polling lifecycle.

## Phase 5 contracts

- `core/search-contracts.ts`: typed scope, request, destination, result and per-project coverage; opaque project-ID validation. No persistence or UI.

- `core/markdown.ts`: `markdownTokens` exposes the existing safe parser for extraction.
- `core/search-extraction.ts`: pure section/body/code/title extraction plus technical
  identifier normalization, independent of storage. Reuses reader heading fragments;
  conservatively omits raw-HTML paragraphs and images, retains fenced code.

- `core/search-index.ts`: lazy private FTS5 schema, atomic changed-document section
  replacement, approval pruning, project pruning, schema/corrupt recovery and close.
  Reads no target files itself; receives approved content/metadata from its caller.
