# Kairn — product context

**Status: CLI, safe init and minimal local viewer IMPLEMENTED; Git history PLANNED.** Kairn is intended to be a local-first, CLI-installable documentation and Git-history explorer for arbitrary software repositories and personal Markdown libraries.

## Principles

- Markdown remains in its original location; Kairn does not force a proprietary authoring format.
- Documentation is for **human reading first**, with potential agent use later.
- A globally installed Kairn can eventually register multiple projects. A project can have multiple documentation directories and individual Markdown files; one primary `docs/` folder is a convenient default, not a restriction.
- Reading navigation is _filesystem-first, source-aware hybrid_: show useful sections rather than redundant `docs/` wrappers, preserve physical paths and separate labels for additional sources.
- Git history is eventually read from the local repository rather than copied to a second permanent history store.
- Project grouping/collections and richer ownership/deployment documentation are optional extensions, not prerequisites for reading Markdown.

## First deliverable: CLI and safe initialization (completed)

Create a global installable `kairn` executable. `kairn init` checks for a direct child `docs/` and can safely create an empty docs directory through an interactive terminal wizard. `kairn --help` and `kairn --version` work. This first milestone does **not** include `kairn run`, a browser UI, Git history, multi-source registry, automatic AI generation, or agent hooks.

## Non-goals

Don't add authentication, telemetry, online accounts, analytics, cloud services, AI/API integrations, auto-generated docs, enterprise structures, or databases to the first milestone.

## Phase 2: read-only local viewer

`kairn run` reads one existing docs root through a loopback HTTP service. A minimal
vanilla browser client displays nested navigation and safe Markdown. It is a
functional prototype, not the final React/Kairn Mineral interface. No writes,
registry, persistence, editing, search, Git history or remote services are added.

The sidebar automatically discovers added, renamed and deleted Markdown files
while running. The current document remains open through navigation changes;
existing content updates on selection. Hidden files/directories remain excluded.
