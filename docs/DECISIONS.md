# Architecture decision log

**Status: INITIAL DECISIONS; design assumptions can evolve.**

## ADR-001 — Local-first, globally runnable CLI

- **Status:** Accepted for initial implementation.
- **Context:** Users should install Kairn once, then work with any repository, regardless of repository language.
- **Decision:** TypeScript/Node.js CLI, globally installable via npm once published; `init` is per-directory.
- **Alternatives:** Python-specific package, embedded library per application, desktop executable.
- **Rationale:** Portable setup with minimal runtime machinery and a clean path to a future local server.
- **Consequences:** Requires supported Node.js on user machine. Does not require npm inside inspected target projects.

## ADR-002 — CLI adapter over reusable core

- **Status:** Accepted.
- **Context:** Later a web UI may use the same discovery and initialization logic.
- **Decision:** Keep prompts and formatting in CLI; reusable filesystem behavior in `src/core/`.
- **Alternatives:** Single CLI script implementing everything.
- **Consequences:** Some boundaries and tests now, with low abstraction overhead.

## ADR-003 — Non-destructive `init`

- **Status:** Accepted.
- **Context:** Kairn must safely attach to existing repositories and notes.
- **Decision:** Discovery is read-only, confirmation precedes writes, existing docs are preserved, repeated init is idempotent.
- **Alternatives:** Automatically scaffolding or replacing docs during `run`.
- **Consequences:** Slightly longer onboarding, substantially safer behavior.

## ADR-004 — Source-aware filesystem navigation (future viewer)

- **Status:** Product direction accepted; implementation deferred.
- **Decision:** Keep physical paths as canonical identity; support multiple sources per project with a reading-first, source-aware hybrid sidebar.
- **Consequences:** Future UI may hide a redundant `docs/` wrapper, but must retain source provenance and Git path fidelity.

Future decisions should record meaningful alternatives and trade-offs rather than every implementation detail.

## ADR-005 — Directory-only initialization

- **Status:** Accepted and implemented.
- **Context:** Initial setup needs a docs root, not generated content or metadata.
- **Decision:** Create only an empty direct `docs/` directory after consent.
- **Alternative:** Write README and multiple starter files.
- **Rationale:** Avoid partial scaffolds, content assumptions and overwrite risk.
- **Consequences:** Users add their own Markdown; no persistent Kairn configuration.

## ADR-006 — Snapshot document service and loopback adapters

- **Status:** Accepted for Phase 2; implementation planned.
- **Context:** A working viewer needs bounded file access without coupling HTTP to discovery.
- **Decision:** One in-memory root snapshot, stable opaque IDs, typed read API;
  built-in HTTP adapter on 127.0.0.1; minimal vanilla browser client.
- **Alternatives:** Database/global index, framework server, full React application.
- **Rationale:** Small reusable contracts, no persistent state, narrow exposure.
- **Consequences:** Restart for new files; edits are reread. No local-user authentication.
  Reject symlinks and hidden entries; require trusted ownership of the source tree.

## ADR-007 — Untrusted Markdown rendering

- **Status:** Accepted for Phase 2; implementation planned.
- **Context:** Documentation can contain executable HTML or remote tracking assets.
- **Decision:** Use maintained markdown-it with raw HTML disabled, restrictive link
  schemes, disabled image loading, and a restrictive HTTP content security policy.
- **Alternatives:** Hand-written parser or arbitrary HTML plus sanitizer.
- **Rationale:** Standard Markdown tables/code support with a smaller content surface.
- **Consequences:** Embedded HTML/images are not rendered; no remote assets or scripts.
