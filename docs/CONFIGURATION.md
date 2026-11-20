# Phase 3 configuration design

Status: IMPLEMENTED; local acceptance recorded in TESTING.md. No appearance, Git or cloud settings.

Library schema v1 stores UUID/name/canonical absolute project root and personal
source/exclusion overrides. Stable IDs survive renaming. Duplicate canonical
roots return the existing registration. Missing roots stay registered.

Locations: macOS `~/Library/Application Support/kairn`, Windows
`%LOCALAPPDATA%/kairn`, Linux `$XDG_DATA_HOME/kairn` or `~/.local/share/kairn`.
`KAIRN_DATA_DIR` explicitly redirects storage, including in every persistence test.
Read operations do not create global data.

Optional `.kairn/config.json` schema v1 contains name and documentation sources
(path, optional primary) plus exclusions. Shared paths use portable project-relative
forward slashes; absolute paths, parent traversal and symlink components fail.
Personal additional sources may be absolute external paths. Unknown fields and
versions fail. No automatic migrations or resets.

Precedence: default docs (README fallback), shared source list replaces defaults,
personal source additions deduplicate by canonical identity. Personal primary wins,
otherwise shared/default primary; exactly one effective primary. Exclusions are
(shared excludes minus exact excludeRemove entries) plus unique excludeAdd entries.
No generic recursive merging. Ignore globs are source-relative: `*`, `?`, `**` only.

Persistence: validate input and existing state, serialize same-process updates,
exclusive sibling lock for cooperating processes, compare revision before replace,
exclusive temporary file + fsync + rename; never unlink the destination first.
Corrupt data and lock files are preserved. Crash locks require explicit manual
inspection/removal, not timeout stealing. No hostile-local-process or network-FS
transaction guarantee; parent directories must be user-controlled.

Source resolution validates real directories/Markdown files, records canonical
identity/provenance, rejects symlinks and reports missing sources. Discovery only
suggests direct docs and root README; approving config/Library changes is explicit.
Primary navigation is unwrapped; additional sources have labeled sections. The
existing document scanner/reader and refresh lifecycle are extended, not replaced.

## Implemented exclusion and overlap rules

Patterns are case-sensitive and source-relative, independent of .gitignore.
`*` matches within one component, `?` one character, and whole-component `**`
zero or more directories (or all remaining components at the end). No negation,
braces, character classes or backslashes. Any matching rule excludes the document.
Overlapping declared roots are reported by `sourceOverlaps`; engine deduplication
is canonical-file based, with primary source then declaration order winning.

## Shared schema v1 example

```json
{
  "schemaVersion": 1,
  "name": "My project",
  "documentation": {
    "sources": [
      { "path": "docs", "primary": true },
      { "path": "README.md" },
      { "path": ".github/DEPLOYMENT.md" }
    ],
    "exclude": ["**/AGENTS.md", "**/drafts/**"]
  }
}
```

## Personal Library schema v1 example

```json
{
  "schemaVersion": 1,
  "revision": 1,
  "projects": [
    {
      "id": "0a471615-4601-444c-8fa7-99f50e11862a",
      "name": "My project",
      "root": "/home/example/my-project",
      "overrides": {
        "additionalSources": [],
        "disabledSources": [],
        "excludeAdd": [],
        "excludeRemove": []
      }
    }
  ]
}
```

Personal `primary` optionally names an effective source path. disabledSources
removes exact declared paths without modifying shared config. Additional aliases
for the same canonical source collapse to the first declaration. If no primary
remains, the first source becomes primary. Multiple primary declarations fail
unless a personal primary explicitly resolves the conflict. Missing sources are
reported; source remove can disable/remove a missing path to repair configuration.

Unknown keys fail. Config reads and Library files are capped at 1 MiB, Library
projects at 1000, effective sources at 32 and exclusion arrays at 100 entries.
Writes use private file modes where supported. Directory rename durability depends
on OS/filesystem behavior: the temp file is synced, not the parent directory.
A crash may leave a lock/temp file; never silently delete or migrate unknown data.
Valid configuration changes reload automatically; file-tree refresh continues across sources.

Live invalid-config recovery and registration-loss behavior are defined in
[reading contracts](READING.md). No reload operation persists discovered paths.
