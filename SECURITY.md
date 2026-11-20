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
