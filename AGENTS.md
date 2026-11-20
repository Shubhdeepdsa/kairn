# AGENTS.md — Kairn engineering instructions

> **Scope:** entire Kairn repository. More specific `AGENTS.md` files apply in their directories.
> **Product:** local-first Markdown documentation and Git-history explorer. **Current milestone:** Phase 2: read-only localhost documentation viewer and `kairn run`; preserve Phase 1.
> **Priority:** small, verifiable, modular work; documentation is maintained with code, not reconstructed afterwards.

## 1. Preflight and source of truth

1. Read `docs/README.md`, `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/CLI.md`, `docs/MODULE_CATALOG.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md` and `docs/TESTING.md` **as applicable** before a substantial change. Do not dump the whole repository into context for small tasks.
2. Inspect the actual `package.json`, lockfile, TS/tool configs and tests before editing. **Verified source and tests prevail over older documentation**; reconcile discrepancies in the same change.
3. Search for existing code and public APIs before creating a module. Prefer **reuse → extend → compose → extract common code → new module**. Do not introduce abstraction layers for one trivial use case.
4. The locked product direction is Kairn: local-first, CLI-powered, Markdown-first, multiple paths per project, Git read-only history later. The visual identity is Kairn Mineral; Phase 2 permits a minimal vanilla browser viewer, not the final React interface.
5. Do not assert that planned features work. Mark proposed, implemented and verified states distinctly.

## 2. Architecture boundaries

- `src/core/`: library-like domain logic (path validation, docs discovery, safe initialization) with no prompts, process exits, ANSI rendering, or web dependencies.
- `src/cli/`: argument parsing, Clack prompts, status/error presentation; calls core APIs, never owns filesystem algorithms.
- `tests/`: focused unit and integration tests with temporary fixture directories.
- `docs/`: reader-friendly behavior, architecture, decisions and change documentation.
- `src/server/`: loopback HTTP adapter over document contracts; no filesystem discovery algorithms.
- `src/viewer/`: minimal browser assets and safe Markdown rendering, no React.
- Dependency direction: CLI composes server/core; HTTP consumes core contracts; core imports neither adapter. Shared types belong with the owning core module. Avoid circular dependencies.
- Only loopback HTTP is permitted at runtime. No telemetry, remote services, database, React, GitHub API integration or AI.
- CLI must work with projects written in any language; never assume the target has Node/npm packages or a Git repository.

## 3. TypeScript and public API quality

- Node.js 26 LTS baseline; use current stable versions compatible with Node 26 after checking official manifests. TypeScript in `strict` mode; use explicit types at public boundaries, no unjustified `any`, no suppressed compiler errors.
- Prefer standard Node built-ins; introduce a dependency only for a clear reason. Use a single npm lockfile and reproducible `npm ci`.
- Use **TSDoc-compatible `/** ... */` comments** on exported functions, types and interfaces where their contract, edge cases or safety behavior are not self-evident. Include `@param`, `@returns`, `@throws` when useful. Document _why_, not obvious syntax; no comment spam.
- Keep a clean public API and stable exit codes. Never call `process.exit()` from reusable core code.
- Avoid unsafe shell invocation, path traversal, unbounded scans, unnecessary file rewriting, hidden side effects, or dependency on user secrets.
- Preserve existing user files; default to no overwrites. Operations must be idempotent or report a clear, actionable conflict.

## 4. Documentation is part of done

Update the smallest relevant docs **in the same commit as behavior changes**:

| Change                                                        | Update                                                               |
| ------------------------------------------------------------- | -------------------------------------------------------------------- |
| New module / exported reusable API                            | `docs/MODULE_CATALOG.md` and TSDoc for nontrivial public contracts   |
| CLI flags, user prompts, output or exit behavior              | `docs/CLI.md` and usage in root `README.md`                          |
| Cross-module boundary, persistence or architectural trade-off | `docs/ARCHITECTURE.md`; significant rationale in `docs/DECISIONS.md` |
| Tests, scripts and quality gates                              | `docs/TESTING.md`                                                    |
| Completed milestone or deferred feature                       | `docs/ROADMAP.md`                                                    |
| User-facing behavior or scope                                 | `docs/PRODUCT.md` if materially changed                              |

- Never mark a command, module or quality gate **verified** until its checks have actually run.
- Do not duplicate long descriptions across several documents. Prefer concise indexes and links to canonical owners.
- Keep examples cross-platform, generic and free of company information or secrets.

## 5. Testing and quality gates

- Every substantive filesystem behavior requires tests: fresh project, existing docs, cancellation, user declined creation, unreadable paths, repeated runs, unexpected file type, conflicts and path safety as applicable.
- Use temporary directories and fixture data; tests must never alter the developer's real home, repo, global Git config or GitHub account.
- Use deterministic tests without paid services, network or arbitrary time delays. Mock prompt adapters at the CLI boundary, not core functions.
- Configure and run `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build`, and `npm run docs:lint` once scripts exist. Be transparent if a check cannot run.
- GitHub Actions should run these checks on pushes and pull requests with minimum permissions. Do not add publication to npm or deploy anything.

## 6. Git and GitHub safety — mandatory

- Make **small, topical, meaningful Conventional Commits**, by phase; never collapse project setup and features into one giant initial commit. A feature and its tests/docs can be in one coherent commit.
- Before _each_ commit: review `git diff --check`, staged diff, relevant checks, and changed docs. Commit only intended files. Never use `git add -A` blindly in an unrelated working tree.
- Do not rewrite history, force-push, use `--no-verify`, delete user branches or alter unrelated files.
- GitHub publication must target the **user's personal GitHub account**, never a company or organization. Verify `gh auth status`, `gh api user --jq .login`, user account ownership and target remote before creating or pushing. If personal identity cannot be distinguished confidently, ask for confirmation **before remote creation or push**.
- Create `PERSONAL_LOGIN/kairn` as **public** only after inspecting all staged/committed files for passwords, API keys, internal/company names, local paths and other sensitive information. Never publish company code or private project documentation.
- If a repo named `kairn` already exists, do not overwrite/reinitialize it; inspect and request direction if nonempty or divergent.
- If GitHub CLI or authentication is unavailable, finish local phases and report exact commands needed; never claim the repo was pushed.

## 7. Scope restraint

**Build now:** read-only nested Markdown engine, secure loopback HTTP, minimal vanilla viewer, `kairn run`, tests/docs/CI. Preserve help/version/init. Push a phased feature branch to the existing personal remote and open a PR; do not merge automatically.

**Do not build now:** final React UI/design system, global registry, multi-root configuration, Git timeline, editing, search, agent automation, MCP, AI, cloud services, or SQLite. Do not create another repository or publish to npm.

## 8. Completion report

Report: phase and commit hashes, what actually works, quality checks (pass/fail/not run), documents changed, personal GitHub URL and push verification (or precise blocker), and next smallest milestone. Never invent successful checks.
