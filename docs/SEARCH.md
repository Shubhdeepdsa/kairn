# Local search design

Status: Phase 5 contracts and Markdown extraction IMPLEMENTED; indexing, queries and palette PLANNED.

## Identity and ownership

Global scope contains only current Library registrations. Project scope accepts a
registered UUID or the active run session's random identity. Unregistered sessions
are never registered implicitly or included in global results. Display names are
labels; duplicate names keep distinct IDs. Document identity stays with the existing
safe document engine; section position/fragment is derived search data.

## Boundaries

Markdown extraction shares the existing parser and heading algorithm. A disposable
SQLite FTS5 index owns extracted sections and content-specific hashes, separate from
JSON Library/shared configuration. Search owns validated literal queries, weighted
ranking, document grouping and plain-text snippets. An application coordinator owns
approved configuration, bounded reconciliation and honest per-project coverage.
Navigation resolves a project-aware destination independently of search. A reusable
palette controller owns scope/query/selection; the vanilla DOM adapter owns focus.
Core imports no CLI, HTTP or browser code.

## Proposed lifecycle and limits

Lazily store search.sqlite in the machine-local Kairn data directory, never project
repositories. Rebuild unsupported/corrupt derived data without changing Library or
Markdown. Serialize database jobs with transactions and bounded busy handling.
Substantial synchronous SQLite operations run off the reader thread. Read approved
files through existing safety limits; hash content, not navigation-dependent ETags.
Only changed content is reextracted. Remove stale documents and unregistered projects.
Before releasing results validate current registration/configuration; unavailable
projects yield coverage warnings and no old results. No background daemon or crawler.

Queries are ordinary text, capped at 256 characters, 16 tokens and 50 results.
Parameter binding and quoted MATCH tokens are separate protections. Ranking prefers
exact/strong titles, headings, paths, body and then code; choose one best section per
document. Technical punctuation and identifier tokenization need a real FTS spike
and fixed ranking fixtures. Snippets are bounded plain text, never HTML highlights.

## Reader and palette contract

Project-aware URLs extend legacy document/heading bookmarks. One loopback server
resolves registered project IDs, not browser-supplied paths. The palette returns a
destination to reusable navigation. Back/Forward and copied URLs restore the project
and heading. Cmd/Ctrl+K defaults to active project scope; removing the chip switches
to global. Empty-input Backspace removes scope only outside composition/selection.
Global @project completion removes only the selector and retains query terms.
Escape closes suggestions before the dialog. No React or settings/Library UI.

## Verification plan

Each stage adds focused tests and maintains the module catalog. Acceptance uses
isolated temporary projects/storage, real SQLite and HTTP, installed CLI and honest
browser observations. CI must verify FTS5 and locking on Linux/macOS/Windows before
cross-platform support is claimed. See [testing](TESTING.md).

Extraction preserves whole identifiers and adds camel-case components. Punctuation
uses Unicode token boundaries; raw HTML paragraphs and image metadata are omitted
conservatively, while literal fenced code remains searchable.
