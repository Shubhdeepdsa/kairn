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

## SQLite compatibility and storage implementation

The Node 26.13.0/macOS spike verified built-in `node:sqlite` FTS5, unicode61,
weighted bm25 and snippets on SQLite 3.54.1. `DatabaseSync` remains the compatible
Node 26 type/API (newer runtimes also export Database). No native dependency.
Official API: <https://nodejs.org/api/sqlite.html>. Operations are synchronous;
substantial work must run in a job worker. Three-platform CI runs the same real
FTS5 and locking tests; local macOS success is not cross-platform evidence.

`search-index.ts` stores schema v1: documents keyed by project/document with content
revision and source/path metadata; derived FTS sections retain original title,
heading/fragment/position/body/code alongside separately weighted searchable fields.
Private data directory/files use 0700/0600 where supported. DELETE journaling and
FULL synchronous transactions keep cooperating process writes coherent, with a
250 ms lock timeout. Busy errors are recoverable; incomplete transactions roll back.
Unsupported versions rebuild derived tables transactionally. Offline corrupt main
files are quarantined under unique names; exclusive recovery locks are never stolen.
Do not damage a database while any process has it open. Concurrent hostile file
replacement and network filesystems are outside the supported local-user boundary.

## Implemented query semantics and ranking

Queries become at most 16 unique normalized Unicode alphanumeric/underscore words.
Whole identifiers and camel-case aliases are indexed. Punctuation splits tokens;
all words use quoted prefix matching joined by AND. No Boolean/phrase language.
For example node:sqlite matches node AND sqlite; --no-open matches no AND open;
createDocumentService retains its whole token and aliases create/document/service.
Empty or punctuation-only input returns no results; malformed FTS syntax is literal.

One shared engine filters eligible project IDs, retrieves at most 2,000 candidate
sections using weighted BM25 (title 10, heading 6, path 4, body 2, code 1), then ranks
by exact title, all-term title, heading, path, body, code. BM25 breaks ties within
these evidence-tested tiers; stable project/document IDs resolve remaining ties.
One best section per document is returned with original path/title/fragment and a
plain snippet capped at 232 characters. The 2,000-candidate cap is a bounded V1
recall tradeoff for very common queries across a large Library.
