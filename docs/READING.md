# Live reading and link contracts

Status: IMPLEMENTED. See TESTING.md for verified coverage and limitations.

## One refresh cycle

While visible, the browser refreshes the tree/configuration, then conditionally
reads only the selected document. A new cycle is scheduled two seconds after the
previous one finishes; visibility return triggers an immediate cycle. Requests
coalesce at the service boundary. Page disposal removes timers/listeners; server
shutdown retains its existing bounded connection cleanup.

Tree changes rebuild only navigation, preserving collapsed folders and selection.
Current content changes update only the article and outline, retaining focus,
scroll position or the selected heading where practical. Unchanged HTML retains
its DOM nodes. Background reads do not flash loading states. Selection generations
discard late reads; link generations discard late click resolutions. Deletion or
exclusion selects README/the first remaining readable document, or an empty state.

Only the active document is read/hashed each cycle, not every document or project.
This deliberately reads the bounded active source even when its timestamp is
unchanged: atomic editor saves and same-size/timestamp edits must be noticed.
ETags suppress unchanged response bodies, parsing/diagnostics and article updates.
The document representation revision includes current navigation to invalidate
warnings after a destination is added/removed. Fragment diagnostics for edits in
other documents are validated again on click; no background whole-project audit.

## Configuration reload

The application reloads only the active project's shared config and relevant
personal record, using the existing strict resolver and limits. A fingerprint of
effective settings controls service replacement. A replacement must fully validate
and discover before the active service changes. Display names do not determine IDs.

Invalid/unreadable settings retain the last valid configuration and show a generic,
redacted warning; retry occurs next cycle. Vanished approved sources can leave the
navigation while their persistent declarations remain available for repair.
Deleting shared config resolves defaults and personal overrides again. Losing a
bound registration does not silently select another project: the last valid view
remains with a warning. Neither discovery nor reload writes JSON or registers paths.

## Local links and diagnostics

Core resolves from the origin document's canonical parent, decodes URL paths once
and looks up the exact canonical destination among effective documents. It does
not probe arbitrary link paths, match display titles or trust browser path rules.
Spaces/Unicode, dot segments, Markdown extensions and fragments are supported.
External approved files can link only to other effective documents, not arbitrary
siblings. Excluded/unregistered destinations do not become readable through links.

`MISSING`, `EXCLUDED`, `UNREGISTERED`, `MISSING_FRAGMENT`, `INVALID`, `UNREADABLE`
and `LIMIT_EXCEEDED` explain failures. A diagnostic contains origin ID, authored
target, code and message; it never adds internal absolute destination paths.
At most 32 unique parsed links in the active document are checked. Excess is
reported explicitly. HTTP/HTTPS/mailto URLs are not fetched. Unsafe schemes and
raw HTML remain nonexecutable; unsafe Markdown link syntax may render as text.

The existing heading slug algorithm is unchanged: Unicode letters/numbers,
punctuation removal, whitespace-to-hyphen and numeric suffixes for repeats.
The outline shares the same parsed heading IDs as rendering and link validation.

## Browser identity and URLs

URLs are `#<id>` or `#<id>/<percent-encoded-heading>`. Existing ID-only URLs remain
valid; default docs entries also expose a legacy relative-path ID alias. User
navigation pushes history; initial/fallback choices replace; Back/Forward and
hash changes restore without pushing. Invalid bookmarks show an error. Same-file
heading history does not replace the article.

Canonical-path IDs remain stable across source reordering, primary changes and
exclusion/restoration. Rename changes the ID; same-path deletion/recreation reuses
it. Source/project-relative provenance remains separate from title and URL ID.
Default unregistered viewing now uses project composition; legacy aliases bridge
its previous relative-path bookmarks. No absolute paths are exposed in tree output.

## HTTP additions

Existing Host/Origin/Fetch Metadata/CSP, GET-only, body/header/URL limits remain.
No write routes, arbitrary path routes, CORS or external requests are added.

- GET `/api/tree`: `{ tree, warning? }`; refreshes configuration/navigation.
- GET `/api/documents/<id>`: `{ id, path, title, markdown, revision, html?, headings,
diagnostics }`, with quoted ETag. Exact If-None-Match returns 304 without a body.
- GET `/api/links/<origin-id>/<encodeURIComponent(authored-target)>`: typed
  `{ kind: "document", id, fragment }`, `{ kind: "external", href }`, or
  `{ kind: "diagnostic", diagnostic }`. The encoded field is data, never a file route.
- GET `/navigation.js`: one fixed packaged browser module; no dynamic asset routing.

Tree warnings and diagnostics use textContent in the POC. No final settings
UI, remote images, attachment serving, syntax-highlighting ecosystem or full link
index is introduced. Loopback is still not authentication against local processes;
user-controlled source/storage parents remain required.

## Phase 6C React Documentation Explorer parity

In Phase 6C, the React Documentation Explorer at `/app/projects/:projectId/docs[/:documentId]` achieves feature parity with the vanilla reader:

- **Scoped APIs**: Consumes `/api/projects/:projectId/tree`, `/api/projects/:projectId/documents/:id`, and `/api/projects/:projectId/links/:id/:href`.
- **Live Refresh Loop**: Runs the identical ~2s bounded cadence while visible, pausing on hidden tabs (`document.hidden`), checking for tree changes, sending `If-None-Match` on document reads to handle HTTP 304 without DOM destruction, and gracefully displaying warning banners on vanished files with fallback to `README.md`.
- **Link Resolution**: Intercepts relative Markdown link clicks inside `SafeHtmlArticle` and resolves them via server-backed link categorization, displaying accessible `DocCallout` warning dialogs for broken or unresolvable targets.
- **Legacy Bookmark Bridging**: Translates `#id` and `#p/projectId/id/fragment` locations into `/app/projects/:projectId/docs/:documentId[#fragment]` via `parseReaderLocation`.
- In Phase 6D, the React Documentation Explorer becomes the canonical reader on `kairn run`. Root `/` redirects to `/app` with full backward compatibility, and the legacy vanilla viewer presentation is retired.
