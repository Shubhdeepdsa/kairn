# Local search design

Status: Phase 5 core indexing, queries, navigation, controller and vanilla palette IMPLEMENTED; final acceptance in progress.

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

`search-index.ts` stores schema v2: documents keyed by project/document with content
revision, approval/configuration hash and source/path metadata; derived FTS sections retain original title,
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

## Implemented indexing coordinator

Search lazily starts one local worker and opens the derived cache there. Equal
requests coalesce; at most eight jobs may be pending. Worker jobs serialize SQLite
and reuse the document engine/config resolver. Each job checks at most 200 documents,
8 MiB of source, 32 projects and approximately 250 ms of between-document work (a
single bounded scan/read/transaction can exceed that time). Coverage reports projects
not reached as indexing; repeat search to continue. There is no daemon or extra
polling loop. Complete unchanged configuration reuses content coverage for at most
1.5 seconds to avoid full rescans on every keystroke; configuration itself is checked
on each request. A fresh reconciliation hashes approved bytes and reextracts only
changed content. Ignored/unregistered/deleted documents are pruned before querying.
Unavailable projects return no old results. Partial/indexing results are explicitly
incomplete, not a claim that unchecked files are current. Large Libraries may need
several requests; progress does not imply an unbounded background scan.

Transient sessions use a separate generated cache subdirectory and are excluded
from global search. Orderly shutdown drains jobs and closes handles; after 1.5 seconds
it terminates the worker, allowing SQLite rollback. Forced termination can leave
rebuildable transient cache bytes; it never unregisters or rewrites project data.

## Implemented project-aware navigation and HTTP

`ProjectNavigator` validates registration/configuration and reads approved IDs,
independent of search. At most two inactive services are cached; each request checks
current configuration and refreshes the selected service. No new server per project.
Project-aware bookmarks use #p/project-id/document-id/encoded-fragment; old `#id` and
`#id/fragment` continue to resolve in the originally opened context.

Same-origin GET endpoints: /api/context returns the initial ID/name; /api/projects
returns registered ID/name suggestions only; /api/search accepts query, optional
project, limit and refresh=1 (no duplicates/unknown parameters). /api/projects/project-id/tree,
/documents/id and /links/id/encoded-target reuse the existing safe reader adapters.
All original Host/Origin/Fetch Metadata/CSP/size/method limits apply before dispatch.
Project and search responses contain IDs/relative metadata, never canonical paths.

## Implemented reusable palette controller

`SearchPalette` is a DOM-free controller with injected search/change capabilities.
It owns contextual open/global open, explicit scope, cursor-aware @ selectors,
query-preserving project selection, deterministic duplicate-name suggestions,
selection movement, Escape precedence and composition/selection-safe Backspace.
Queries debounce by 200 ms; generations discard replies after text/scope/close
changes. Coverage is visible, error/empty states are distinct, explicit refresh
continues bounded indexing without another polling loop. Disposal cancels timers.

## Implemented minimal viewer adapter

The existing vanilla viewer now has Search and Cmd/Ctrl+K. Its accessible dialog
uses combobox/listbox semantics, active-descendant selection, a focus trap, inert
background and focus restoration. Project/global chips, @ suggestions, keyboard
selection, status/coverage, refresh and error/empty states compose the controller.
Result labels/snippets use textContent only. Requests are abortable; stale replies
are ignored. The result callback invokes the shared project-aware reader navigator.
No React, final design system, settings screen or extra polling loop is introduced.

## Acceptance hardening bounds

A document with more than 512 derived sections or a title/heading/fragment longer
than 512 characters is omitted with partial coverage, rather than performing an
unbounded single-document indexing transaction. Existing safe document limits still
apply. Query candidates retain full body/code inside SQLite; only bounded excerpts
are materialized in worker memory. Refresh search sends refresh=1 to bypass the
1.5-second reuse window explicitly. Invalid queries return 400; temporary worker or
cache failures return redacted 503, distinct from project-level unavailable coverage.

Coverage indexed counts are persisted documents, not attempted reads or sections.
An omitted oversized/unreadable document therefore does not inflate a partial count.

Explicit global refresh starts a pass and subsequent refresh requests continue its
unfinished projects rather than restarting completed work. Fresh completed projects
still validate current configuration before reuse, even after the indexing budget
is exhausted. The cursor advances past actual work, avoiding starvation. The optional
core documentBudget only lowers the hard 200-document cap for embedders/tests.

Schema v2 fences each persisted document with the effective configuration hash.
Queries bind the currently validated hash as well as project ID, including cached
coverage reuse. A late writer with obsolete ignore/source approvals cannot reintroduce
results into the newer scope. Updating only this fence does not reparse unchanged
Markdown. Unsupported v1 derived tables rebuild transactionally; Library/config bytes
are untouched. Unregistered project scheduling caches are also released.

Coverage reuse also checks the persisted current-scope document count, so a competing
writer that evicts a newer-scope row triggers reconciliation instead of false emptiness.

## Empty palette and project switching

Enter with an empty/whitespace query and an active project chip closes the palette
and returns focus to the reader without navigation. Removing the chip with an empty
query shows registered projects immediately; arrows and Enter (or a project click)
open the selected project's default approved document. A selector with no remaining
search terms also switches projects. Selecting a project while terms remain keeps
the palette open, creates its scope chip and preserves those terms.

Project-only navigation reuses the reader's default selection and approved tree/ID
routes, then records the chosen document in the existing project-aware URL/history.
Reselecting the already-open project only closes the palette, preserving the current
document, URL, history and reading position. Explicit document destinations still
navigate within that project. An unavailable or empty project leaves the previous
reader intact with a message.
Empty palettes do not issue full-text indexing requests. No new API endpoint or
filesystem access is introduced.
