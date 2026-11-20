# Kairn architecture

**Status: CLI/core boundary IMPLEMENTED and tested. Future viewer is PLANNED.**

## Boundary diagram

```text
Command line / @clack/prompts
         │
         ▼
   src/cli/ (adapter)
         │ calls typed interfaces
         ▼
   src/core/ (filesystem discovery, planning, safe apply)
         │
         ▼
 Node.js filesystem APIs
```

**Dependency rule:** CLI imports core, never the reverse. Tests may import both. No external services are required.

## v0 module structure

```text
src/
  cli/       command parsing, prompts, human-readable output
  core/      discovered docs root, non-destructive initialization
  index.ts   CLI executable entrypoint or equivalent

tests/      temporary-filesystem and CLI adapter tests
docs/       living project documentation
```

Do not create empty layers/packages simply to mirror this diagram. Choose filenames according to real responsibilities when building. Keep types next to their owners; avoid dependency injection frameworks for one small CLI.

## Future, not part of v0 CLI milestone

- One local Node.js HTTP process and static React app.
- Local project registry and multiple documentation sources per project.
- Source-aware hybrid document navigation and Markdown rendering.
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

## Phase 2 design — PLANNED

CLI composes the document engine and HTTP adapter. Both CLI and HTTP depend on
core contracts; core knows neither prompts nor HTTP. Reuse
`discoverDocumentationRoot` for project `docs/` detection without changing init.

- Core document service: one explicitly selected canonical root, immutable
  navigation snapshot, opaque stable document IDs, bounded fresh reads.
- Server: built-in Node HTTP on IPv4 loopback only; consumes tree/read contracts.
- Viewer: vanilla browser module and CSS; Markdown rendering is a separate module
  using a maintained parser. No React, persistence, registry or live watcher.

Limits will be explicit. Symlinks are rejected for selected roots, descendants and
reads. Hidden entries are excluded. Canonical file identities remain internal;
HTTP exposes only relative paths and IDs. Restart to discover added files.

Security boundary: user-controlled trees, not hostile concurrent filesystem
mutation. HTTP will validate exact Host/Origin, reject cross-site fetches and
non-GET/body-bearing requests, bound request sizes, and return structured errors.
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
