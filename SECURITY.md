# Security

Do not disclose credentials or exploitable details in public issues. Use the
repository's private vulnerability reporting feature if enabled; otherwise ask
a maintainer for a private reporting channel without posting sensitive details.

Kairn performs local filesystem operations. Run it only in directories you control.
No supported release or response-time guarantee is currently offered.

## Local viewer boundary

The viewer binds only to 127.0.0.1 and validates Host, Origin and browser fetch
metadata. This is not authentication: other local users/processes can read the
selected documentation and approved documentation from registered projects through
project navigation/search. Register only projects whose approved Markdown you intend
to expose to this same local-process boundary. Run in user-controlled trees; Node path validation cannot guarantee
atomic containment against hostile concurrent ancestor replacement. Symlinks,
hidden entries and arbitrary file routes are rejected or excluded.

Untrusted Markdown is rendered without raw HTML, image loading or executable URL
schemes, under a restrictive CSP. No remote assets, shell/Git routes, CORS,
editing or runtime external services are provided. See [architecture](docs/ARCHITECTURE.md)
for limits and [testing](docs/TESTING.md) for evidence and coverage limitations.

## Configuration and personal Library

Only explicitly confirmed project commands write metadata. Shared paths cannot
escape the project; external source paths must be personal additions. Explicit
Markdown files inside hidden directories are allowed, while recursive hidden-file
discovery remains disabled. Source symlink components and special files are rejected.
Library absolute paths and overrides are not served by HTTP. External docs are
exposed to the same local-process trust boundary as project docs once approved.

Strict versioned validation preserves malformed/unsupported files. Cooperating
writers use an exclusive sibling lock, stale-value checks, synced private temp
files and rename; no stale-lock stealing. Inspect crash leftovers manually. This
is not a guarantee against malicious concurrent processes or network filesystem
locking anomalies. Use trusted application-data and project parent directories.
No automatic migrations, global singleton, or browser-accessible metadata writes.

## Live reader and links

Reload uses the same strict configuration/source validation, with atomic service
replacement and redacted warnings. Recoverable errors retain the last valid
approved configuration; this is not a new authorization mechanism. Core link
resolution uses only known effective document identities. It never serves an
unchecked link path or fetches remote URLs. Diagnostics check at most 32 parsed
links from the active document, under the existing bounded source/read limits.
The extra encoded link route is GET-only under the same Host/Origin/CSP restrictions.
See [reading contracts](docs/READING.md) for exact API and freshness limitations.

## Local search cache

Phase 5 stores derived searchable text in private machine-local SQLite data, never
inside projects. Explicit registered projects are eligible for global search; an
unregistered active session is separate. Treat cache/quarantine files as private
document content. No telemetry, remote requests or browser SQLite. Project routes
resolve approved IDs through current Library/configuration; query text becomes
bounded quoted FTS terms with SQL parameter binding. Same-origin protections remain.
Offline corrupt cache recovery never resets Library/configuration. Inspect recovery
locks rather than stealing them; hostile concurrent filesystem mutation remains out
of scope. Bounded jobs report incomplete coverage explicitly.

Search queries bind the currently validated effective-configuration hash to indexed
documents. An obsolete cooperating writer cannot reintroduce ignored-source hits
into a newer scope. Shared-cache approval drift invalidates coverage reuse.

## React foundation assets

The transitional `/app` namespace serves packaged static output only. At startup,
the loader rejects symlinks, non-regular files, nested assets and unexpected types;
limits are 32 JS/CSS/font/SVG assets, 2 MiB each and 8 MiB combined, plus 64 KiB HTML.
Requests only look up a preloaded map. Unknown app pages use the React not-found
view; APIs, missing assets, encoded/traversal paths and other routes never receive
SPA HTML. The same request checks apply; /app permits same-origin images for packaged logos,
while the vanilla reader retains img-src none. No maps, inline scripts/styles,
CDNs, mutation endpoints, proxy or development server are exposed. Build-watch
requires restarting Kairn to reload its asset snapshot. Package files and their
parents must be user-controlled, like the existing document/storage boundary.

Phase 6B adds only packaged WOFF2 fonts to the bounded asset allowlist and
`font-src self` to CSP. Font notices ship with the package but have no HTTP route.
No remote font/image loading, inline style exception or mutation endpoint is added.

Header branding adds four trusted packaged SVGs to the bounded startup map.
SVG requests use image/svg+xml; no user-document image routing or remote images
are enabled. Source logos contain no scripts, external references or embedded HTML.
