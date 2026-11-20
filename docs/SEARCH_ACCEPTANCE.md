# Phase 5 acceptance

Status: local automated/installed-package/CLI/API checks performed; human browser
verification is not claimed. Final quality/remote CI evidence belongs in TESTING.md
and the feature PR. Do not infer Phase 5 browser success from Phase 4 acceptance.

## Evidence boundaries

The installed-package integration uses real HTTP and DOM events, not a real browser.
A separate manual run kept a real server in Terminal A and used Terminal B for curl,
fixture edits and supported CLI operations against the same PID/port. It verified
scoped/global/section/technical matches, immediate explicit-refresh reindexing,
ignore/source removal, unregistration, unavailable-root recovery and graceful stop.
Only the deliberately edited A document changed among original fixture documents;
unregistered B files were unchanged. Full terminal/header/body artifacts were saved
outside the repository. No existing projects or normal Library were modified.

The browser tool still reports local browser use disabled in Work settings, even
though the user previously showed that setting On. Browser interactions below
remain manual follow-ups; the automated DOM evidence does not replace them.

## Reproducible benchmark

Run `npm run build` then `node scripts/benchmark-search.mjs`. The script creates
and removes temporary source projects and its own Library/index. Measurements on
Node 26.13.0/macOS, 100 warm engine queries per dataset:

| Dataset              | Source size   | Initial index/reconcile | Jobs | Query median | Query p95 |
| -------------------- | ------------- | ----------------------- | ---- | ------------ | --------- |
| 30 docs, 1 project   | 48,740 bytes  | 83.71 ms                | 1    | 0.317 ms     | 0.405 ms  |
| 300 docs, 1 project  | 487,690 bytes | 377.99 ms               | 2    | 2.177 ms     | 3.675 ms  |
| 300 docs, 3 projects | 487,470 bytes | 524.29 ms               | 2    | 2.309 ms     | 3.524 ms  |

All jobs reached ready coverage. Initial time includes worker start, approved-file
reads and reconciliation, not source fixture creation. Warm query times exclude
filesystem reconciliation/HTTP/DOM. Main-thread 1 ms timer callbacks continued during
worker work (72/335/455 samples); this demonstrates off-thread work, not a browser
latency guarantee. No performance threshold is promised. CI timing can differ.

## Manual setup

Use disposable project A, B and C directories with docs containing authentication,
configuration resolver, code/technical identifiers and repeated headings. Register
only those fixtures. In both terminals set KAIRN_DATA_DIR to the same new temporary
Library directory; never use an existing project or normal Library. Build the feature
branch and use the absolute dist/index.js path. Record cwd, commit, Node/OS, commands,
outputs/exit codes, ID/name pairs, URL, coverage and initial/final document hashes.

Register using `kairn project add --cwd <fixture> --name <label> --yes` and inspect
`kairn project list`. Terminal A runs `kairn run --project <A-id> --port 0 --no-open`.
Leave it running throughout live-change tests. Terminal B runs curl and supported
project commands with the same isolated environment. Record screenshots and actual
elapsed browser observations. Use Refresh search after changes for immediate
reconciliation; ordinary searches reuse coverage for at most 1.5 seconds.

## Required scenario checklist

| Scenario             | Action and expected observation                                                          | Existing evidence                   |
| -------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------- |
| 1 Project scope      | Cmd/Ctrl+K opens with A chip; authentication returns only A                              | API + DOM                           |
| 2 Global             | Remove chip; available indexed A/B/C results have project labels                         | API + DOM                           |
| 3 Project picker     | Type @ then @proj; suggestions filter, duplicates retain IDs                             | Controller + DOM                    |
| 4 Query preservation | Type authentication @proj; select B; query remains authentication                        | Controller + DOM                    |
| 5 Backspace          | Empty Backspace removes chip; text/selection/IME editing remains normal                  | Controller + DOM                    |
| 6 Ranking            | Exact title outranks heading, path, incidental long body and code                        | Fixed real FTS corpus               |
| 7 Section            | Search configuration resolver; result opens its heading                                  | API + DOM                           |
| 8 Project navigation | Global B result opens actual B; Back restores A, Forward B                               | Installed API + DOM                 |
| 9 Content change     | Edit A externally, Refresh search: old term gone, new term found                         | Manual API + installed integration  |
| 10 Ignore            | CLI ignore add/remove: result disappears/returns, original file unchanged                | Manual API + integration            |
| 11 Source            | CLI source add/remove: entries appear/disappear without server restart                   | Manual API + integration            |
| 12 Unregister        | Remove fixture B registration: no results/suggestions; bytes unchanged                   | Manual API + integration            |
| 13 Unavailable       | Temporarily rename C root: unavailable coverage, no stale hits; restore recovers         | Manual API + integration            |
| 14 Corruption        | Stop all test servers, damage only disposable index, restart: rebuilds                   | Real SQLite + installed integration |
| 15 Unregistered      | Run new local fixture by cwd: project search works; no global registration               | Installed integration               |
| 16 Technical         | Query createDocumentService, node:sqlite, --no-open, GET /api/tree, docs/architecture.md | Real FTS + installed integration    |
| 17 Security          | Invalid IDs/FTS/encoding/traversal, unsafe Markdown: safe refusal/text                   | Regression API + DOM                |
| 18 Platforms         | Run all gates including real SQLite/process/installed tests                              | Three-OS CI required                |

## Browser-specific follow-up

Perform scenarios 1–5, 7–8 and visible portions of 9–13 in a real browser. Verify:

1. Shortcut opens/focuses input; chip is the actual active project. Tab stays inside;
   Escape closes suggestions first, then restores reader focus. IME does not remove scope.
2. Global @ selection preserves surrounding query text; duplicate names are distinct.
3. Result text, loading, empty/error and partial coverage states are readable; no
   snippets execute HTML. Rapid typing/scope changes never show another query's hits.
4. Open B's matching heading. Reload, copy URL to new tab, Back and Forward restore
   correct project/document/section. Old document-only bookmarks still work in A.
5. Edit docs and source/ignore settings from Terminal B. Refresh search and verify
   current eligibility without restarting A. Unregister only disposable B; stale
   destinations fail safely. Temporarily unavailable C reports coverage honestly.
6. Close/reopen palette, then Ctrl+C Terminal A. Verify listener closes, compare
   hashes, preserve evidence and distinguish planned fixture edits from Kairn writes.

Do not corrupt an open/live index. Corrupt fixtures only while their servers are
stopped. No npm publication, real project changes or automatic PR merge.
