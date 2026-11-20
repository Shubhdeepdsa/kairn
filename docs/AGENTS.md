# Documentation-specific instructions

> Inherits root `AGENTS.md`. Scope: `docs/`.

- Treat docs as **living developer-facing documentation**, not marketing copy. Be concise but specific, using real commands and paths only when verified.
- Statuses: `PLANNED` means no implementation claim; `IMPLEMENTED` means code exists; `VERIFIED` means the named checks were run. Never upgrade status without evidence.
- Keep `docs/README.md` as the map; `PRODUCT.md` describes user-facing purpose and V1 exclusions; `ARCHITECTURE.md` module boundaries; `CLI.md` command contracts; `MODULE_CATALOG.md` actual reusable exports; `DECISIONS.md` significant tradeoffs; `ROADMAP.md` milestones; `TESTING.md` verification strategy and results.
- Add architecture decisions only for consequential choices with context, alternatives, rationale, implications and status. Avoid ADRs for routine file additions.
- When code changes, update affected documents within the same topical commit. Remove stale claims and broken links rather than adding contradictory notes.
- Document security/safety limitations honestly, especially write operations and repository publishing. Never include credentials, internal customer/company names, or local personal paths.
- Maintain ordinary portable Markdown; optional frontmatter is not a requirement for these internal docs.
