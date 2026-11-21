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

- `core/search-query.ts`: validated literal/prefix MATCH terms, one scoped ranking
  engine, document grouping and bounded plain snippets; no HTTP/DOM dependencies.

- `core/search-coordinator.ts`: approved Library/session reconciliation, content
  hashes, source/ignore pruning, bounded progress and honest coverage.
- `core/search-service.ts` / `search-worker.ts`: lazy worker facade, duplicate-job
  coalescing, queue bound, redacted failures and bounded resource cleanup. Failed
  workers reject their jobs and are replaced lazily on the next search; late events
  from the failed worker cannot invalidate replacement jobs.

- `core/project-navigation.ts`: independent ID-based project/destination resolver,
  approval validation and bounded service cache.
- `server/search-routes.ts`: narrow read-only search/context/projects decoder and
  project-scoped mapping into the existing reader adapter; no filesystem routing.

- `core/search-palette.ts`: framework-independent search/scope/picker/selection state,
  debounce, request generations, partial/error status and disposal. No DOM or SQLite.

- `viewer/search-palette.ts`: minimal accessible DOM adapter over SearchPalette,
  abortable HTTP search, focus/keyboard lifecycle and injected destination callback.

SearchIndex.documentCount reports persisted document coverage independently of
section count and attempted reconciliation reads.

SearchIndexProject supplies the internal current-configuration query fence; schema-v2
documents retain that hash so late obsolete writers cannot bypass newer ignore rules.

PaletteSelection distinguishes dismissal, project navigation and exact-document
navigation from a query-only scope change. NavigationDestination permits a project
without a document ID; viewer/navigation.defaultReaderDocument shares the initial
reader's approved default choice with direct project switching.

## Phase 6A browser foundation

- `frontend/main.tsx`: React StrictMode composition, separate from Node entry.
- `frontend/app/ErrorBoundary.tsx`: redacted render-error fallback.
- `frontend/styles/`: provisional semantic tokens and light/dark/system mechanism;
  not the final Mineral theme. See [frontend contracts](FRONTEND.md).

- `server/frontend-assets.ts`: bounded startup preload of trusted packaged HTML/JS/CSS/WOFF2/SVG;
  exports `frontendAssetBudget`, `FrontendAssetBudget`, and `loadFrontendPresentation`;
  fixed application namespace, no arbitrary static-file route or source maps.

- `frontend/components/ui/Button.tsx`: native props/ref, shared variants/sizes and
  disabled/loading contract, independent of features.
- `frontend/icons/`: semantic, statically imported Lucide registry; decorative or
  labeled currentColor SVGs, token sizes, and explicit `SvgIconProps` /
  `SvgIconComponent` contracts for custom-provider replacement.
- `frontend/app/providers/ThemeProvider.tsx`: runtime appearance state and root
  attribute lifecycle; CSS owns system/reduced-motion resolution, no persistence.

- `frontend/lib/api/client.ts`: exact same-origin context/projects GETs, cancellation,
  response validation and redacted transport errors; no settings mutation methods.
- `frontend/app/providers/ApplicationProvider.tsx`: one abortable startup-data owner
  with loading/error/retry; route context derives from approved project identities.

- `frontend/app/router.tsx`: centralized nested declarative routes and lazy views;
  existing reader bookmarks stay on `/`, no duplicate history state store.
- `frontend/layouts/`: AppShell/Header own global chrome; Workspace validates
  project context; global/project settings layouts configure the same Sidebar
  disclosure primitive. Features compose these boundaries, without persistence.

- `core/reader-location.ts`: browser-safe legacy/scoped bookmark parser/serializer,
  extracted unchanged from viewer navigation and re-exported for compatibility.
  React handoffs and the vanilla reader share this contract without Node imports.

## Mineral primitives

`frontend/components/ui`: IconButton, labeled native TextInput/Select/Switch,
Badge/Card/Divider/SectionHeading, SettingRow/SettingsSection, SidebarItem, native
Breadcrumbs and manual-activation Tabs. Shared contracts and extension rules:
[design system](DESIGN_SYSTEM.md). No component owns persistence or feature state.

`icons/custom/Wayfinding` supplies an original non-brand SVG alongside Lucide.
SidebarItem owns the 3px active marker across all Sidebar configurations. The
shared Header links only to real foundation/reader routes; no pretend search action.

Icon SVG types are owned by `icons/types.ts` and re-exported by registry for
compatibility, so custom components do not introduce registry import cycles.

`styles/prose.css` scopes static reading foundations to `.kairn-prose`, including
headings/lists/tables/code/quotes/callouts and image-placeholder/caption patterns.
It does not enable rendering or resources; Phase 6C integrates the existing parser.

`features/design-system/ShowcasePage` lazily composes all Mineral primitives at
`/app/design-system`, with real runtime theme/accent previews and static prose.
No new product settings or mutation behavior.

Approved header logos are bundled from src/frontend/assets/brand; responsive
Header composition selects light/dark mark and outlined wordmark assets for explicit
appearance or live system preference, separate from semantic icons.

## Phase 6C Explorer foundation

- `frontend/lib/api/types.ts`: typed browser-safe API contracts (`NavigationEntry`, `DocumentEntry`, `DirectoryEntry`, `TreeResponse`, `DocumentResponse`, `DocumentHeading`, `LinkDiagnostic`, `LinkResolution`), mirroring server contracts without importing Node or core filesystem services.
- `frontend/lib/api/client.ts`: extended with typed same-origin GET methods (`getTree`, `getDocument`, `resolveLink`), validating JSON response shapes and enforcing opaque IDs and route segments.
- `frontend/features/explorer/navigation-tree.ts`: pure tree utilities (`flattenTree`, `findDefaultDocument`, `findDocumentById`, `getPreviousNextDocuments`), matching Phase 5 README-first priority and sequential pagination.
- `frontend/features/explorer/`: `ExplorerShell` (3-region responsive layout shell), `DocTree` (hierarchical navigation tree with active waypoint indicator, directory collapse retention, and warning banner), `DocReader` (reading plane with breadcrumbs, copy path button, metadata, HTML article surface), `DocOutline` (sticky on-page TOC with waypoint dots), and `DocPager` (previous/next footer cards).
- `frontend/components/ui/DocCallout.tsx`: architectural directive / note callout box with 3px yellow wayfinding indicator.
- `frontend/features/foundation/DocumentationPage.tsx`: real Documentation Explorer view wired to server-backed tree and document APIs at `/app/projects/:projectId/docs`, automatically selecting default documents and preserving folder expansion per project.
- `frontend/features/design-system/ExplorerShowcasePage.tsx`: dedicated visual specimen at `/app/design-system/explorer` demonstrating the 3-region layout with canonical Marketing Backend fixture data.
- `frontend/features/design-system/explorer-fixtures.ts`: typed browser-safe fixture data modeling canonical Stitch Marketing Backend specifications.
