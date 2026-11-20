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
