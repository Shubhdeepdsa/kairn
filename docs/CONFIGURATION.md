# Phase 3 configuration design

Status: PLANNED. No appearance, Git or cloud settings.

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
