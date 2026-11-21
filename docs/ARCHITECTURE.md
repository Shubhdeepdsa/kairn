# Kairn architecture

**Status: Phases 1–4 merged; Phase 5 search/navigation/palette boundaries IMPLEMENTED and automatically verified. Human browser acceptance remains separate.**

## Boundary diagram

```text
CLI (arguments, prompts, lifecycle) ──┬──> core document service
                                    └──> HTTP adapter ──> core contracts
                                              │
                                  static viewer + Markdown renderer
                                              │
                                     browser same-origin API
```

**Dependency rule:** CLI imports core, never the reverse. Tests may import both. No external services are required.

## v0 module structure

```text
src/
  cli/       command parsing, prompts, human-readable output
  core/      safe initialization and bounded read-only document service
  server/    loopback HTTP adapter
  viewer/    vanilla browser module, static shell and Markdown rendering
  index.ts   CLI executable entrypoint or equivalent

tests/      temporary-filesystem and CLI adapter tests
docs/       living project documentation
```

Do not create empty layers/packages simply to mirror this diagram. Choose filenames according to real responsibilities when building. Keep types next to their owners; avoid dependency injection frameworks for one small CLI.

## Future, beyond the minimal viewer

- Full React app replacing the minimal vanilla viewer.
- Local Git commit/diff history, with Git itself as the source of truth.

Those future modules must not be stubbed into the initial implementation just to look comprehensive.

## Runtime and safety

- Node.js 26 LTS baseline; run on macOS, Windows and Linux where feasible.
- File operations only with explicit chosen directory; no generated files in a different repository.
- No network dependency or telemetry at runtime for `init`.
- No hidden writes during discovery. Plan and preview before applying changes.

## Implemented core safety

`src/core/initialization.ts` owns direct-child discovery, read-only planning and
explicitly approved application. Init creates only an empty `docs/`; no starter
file is necessary, avoiding partial multi-file scaffolds. Existing docs are reused.
Root symlinks, filesystem roots, docs symlinks and file conflicts are rejected.
Ancestors are canonicalized; plans record root device/inode and revalidate before
applying. Non-recursive mkdir fails rather than replacing concurrent entries.

Node path APIs cannot make ancestor replacement atomic across validation and
mkdir. Operate only in directories controlled by the user, not trees concurrently
modified by hostile processes. No claim of an adversarial filesystem sandbox.

## Phase 2 design — IMPLEMENTED

CLI composes the document engine and HTTP adapter. Both CLI and HTTP depend on
core contracts; core knows neither prompts nor HTTP. Reuse
`discoverDocumentationRoot` for project `docs/` detection without changing init.

- Core document service: one explicitly selected canonical root, immutable
  navigation snapshot, opaque stable document IDs, bounded fresh reads.
- Server: built-in Node HTTP on IPv4 loopback only; consumes tree/read contracts.
- Viewer: vanilla browser module and CSS; Markdown rendering is a separate module
  using a maintained parser. No React, persistence, registry or filesystem watcher.

Limits are explicit. Symlinks are rejected for selected roots, descendants and
reads. Hidden entries are excluded. Canonical file identities remain internal;
HTTP exposes only relative paths and IDs. Bounded rescans discover added files.

Security boundary: user-controlled trees, not hostile concurrent filesystem
mutation. HTTP validates exact Host/Origin, rejects cross-site fetches and
non-GET/body-bearing requests, bounds request sizes, and returns structured errors.
No CORS, remote assets, raw HTML, arbitrary filesystem routes or shell execution.
Loopback is not authentication against other processes running as the same user.

### Implemented document engine

`createDocumentService` now scans .md/.markdown files, directory-first and sorted
by source-relative path using deterministic codepoint ordering. Hard caps: 10,000
entries (including ignored ones), 2,000 documents, 32 directory levels, 1 MiB per
Markdown file. Root and descendant symlinks/special files are rejected; hidden
entries are skipped. Reads validate known IDs, root identity, every path component,
canonical identity and the opened regular file, then read at most the byte cap + 1.
Concurrent hostile ancestor mutation remains outside the security guarantee.

### Implemented HTTP adapter

`src/server/http.ts` binds only 127.0.0.1. GET `/api/health`, `/api/tree`, and
`/api/documents/<id>` return JSON. Expected errors map to 400/403/404/409/413;
unexpected failures return generic 500 messages without local paths. Exact Host
(including actual port), Origin and Fetch Metadata checks reject untrusted browser
requests. No CORS. Raw/encoded path traversal and query strings are rejected.
GET bodies are forbidden; headers cap at 8 KiB, URLs at 2 KiB, active requests at
16, request/socket timeouts at 5 seconds. Close drains requests for at most one
second before closing connections. Optional viewer assets are exact static routes.
Loopback restricts network reachability, not other local users/processes.

### Implemented viewer

Vanilla browser TypeScript is compiled by the existing tsc build. It imports the
packaged browser-safe navigation and palette modules through exact asset routes;
there is no browser package resolution or bundler requirement.
The server receives `ViewerPresentation` at composition time; exact asset routes
serve package content only. Document JSON includes safe `html` alongside source
Markdown when a presentation is supplied. Core Markdown analysis shares parsing
with extraction; core has no HTTP or DOM dependency.
Navigation labels use textContent; only restricted-parser output enters article
HTML. Remote images are replaced with alt text, external links suppress referrers,
and unknown local attachments are not fetched. No syntax highlighting or filesystem watcher.

## Automatic navigation refresh

`DocumentService.refresh()` reuses the bounded scanner and atomically replaces the
navigation snapshot and document-ID mapping. Concurrent refresh calls share one
scan; failed scans retain the last valid snapshot. The original root identity is
checked before and after scanning: a replaced root requires a restart. All existing
symlink, hidden-entry and resource-limit rules still apply.

GET `/api/tree` asks the service to refresh; HTTP owns no discovery logic. The
browser polls this endpoint two seconds after the previous request completes,
pauses when hidden, refreshes on visibility return and removes timers/listeners
on page exit. No overlapping browser polls or persistent server watchers. Sidebar
DOM is rebuilt only when the tree changes; current content, selection and folder
expansion are preserved. Deleted selections fall back to another document.

## Phase 3 implemented composition

CLI → Library / project resolver → resolved sources → existing document engine.
JSON storage owns parsing and transactional replacement; Library owns project
identity. HTTP remains read-only and consumes the same tree/read/refresh contract.
See [configuration design](CONFIGURATION.md). No singleton, database or React work.

Sources resolve in core/config/project.ts and compose through
createProjectDocumentService using the original scanner and safe reader. Directory
and file sources share a total 10,000-entry/2,000-document budget, with existing
per-file/depth caps. Primary navigation omits its wrapper; additional sources have
labeled sections. Source IDs and project-relative paths disambiguate duplicate
titles and cross-source links. External provenance uses opaque IDs and safe labels;
absolute paths remain core/CLI only. Unavailable sources stay declared, and refresh
removes disappeared documents from the view without altering config.

## Phase 4 design — IMPLEMENTED

One visible-tab polling cycle refreshes navigation/configuration then conditionally
reads only the active document. Content revisions are SHA-256 of bounded source;
HTTP ETags suppress unchanged payload/rendering. Background refresh keeps article,
focus and scroll position; stale responses are discarded by selection generation.

Application composition reloads the active project's validated shared/personal
settings, fingerprints effective sources/exclusions, and swaps a complete service
only after successful discovery. Invalid config retains last valid state and a
redacted diagnostic; removing a bound registration requires recovery/re-registration,
not silent switching. Deleting shared config restores defaults/personal resolution.

Core Markdown analysis shares the existing parser/heading algorithm with rendering.
Core link resolution uses originating canonical path and the effective document
set; it never reads arbitrary link paths. Missing/excluded/unregistered/invalid
links and absent fragments have typed diagnostics. Only current-document links
are checked, with an explicit cap; remote URLs are never fetched.

URL contract: `#<document-id>/<percent-encoded-heading>`; legacy `#<id>` bookmarks
remain valid. User navigation pushes history; fallback/initial normalization
replaces. Back/Forward restores selection/fragment without pushing another entry.
Path-based IDs survive source reorder/primary changes but change on rename; same
path recreation regains identity. No title-based identity or browser filesystem logic.

Canonical refresh, identity, link and API details: [reading contracts](READING.md).

## Phase 5 search contracts

Search has independent extraction/index/query/coordinator layers. Navigation and the
palette compose these contracts; see [search design](SEARCH.md). Implementation is
phased; contracts do not imply indexed search is already available.

Phase 5 composition adds a lazy search job worker and a project-aware navigator to
the same loopback server. Scoped reader routes resolve registered IDs and validate
approvals independently of search. See [search contracts](SEARCH.md).
