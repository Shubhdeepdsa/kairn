# Security

Do not disclose credentials or exploitable details in public issues. Use the
repository's private vulnerability reporting feature if enabled; otherwise ask
a maintainer for a private reporting channel without posting sensitive details.

Kairn performs local filesystem operations. Run it only in directories you control.
No supported release or response-time guarantee is currently offered.

## Local viewer boundary

The viewer binds only to 127.0.0.1 and validates Host, Origin and browser fetch
metadata. This is not authentication: other local users/processes can read the
selected documentation. Select only roots whose Markdown you intend to expose
locally. Run in user-controlled trees; Node path validation cannot guarantee
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
