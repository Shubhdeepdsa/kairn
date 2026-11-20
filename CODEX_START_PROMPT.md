# Codex task — Bootstrap Kairn and publish to my PERSONAL GitHub

You are the primary implementation agent for a new **public, open-source project called Kairn**. Work in the **current local directory**, which should be a fresh folder named `kairn` containing the supplied `AGENTS.md` files and `docs/` starter material. First inspect it, read the applicable agent instructions, and preserve existing files. Do not work in or publish to a company repository.

## User intent and hard constraints

Kairn will eventually be a local-first Markdown documentation and Git-history explorer, using a Node.js CLI to run a browser experience. **This assignment is only its small first foundation:** a genuinely installable TypeScript CLI with a beautiful, safe interactive `kairn init` experience, plus project documentation, quality checks, open-source governance, and a clean Git history.

- **GitHub owner: my personal account ONLY.** NOT my company or employer's account; NOT any GitHub organization. You must verify which GitHub account is active before creating the remote, and confirm that it is my personal identity if there is any doubt.
- **GitHub repo:** `kairn`, **public** after a final secret/internal-data check. Create it under the verified personal user (`PERSONAL_LOGIN/kairn`) and push all implementation commits. Never substitute an organization or employer account.
- **Commit discipline:** Absolutely no single giant initial commit. Build in coherent phases, validate them, and create several separate, meaningful Conventional Commits. Push the complete sequence so GitHub shows the actual development progression.
- No branch rewrites, force pushes, fabricated test results, silent file overwrites, or unintended Git modifications.
- Do not implement the React UI, `kairn run` server, Git explorer, multi-project registry, AI agent integration, database, or auto-documentation in this task.

## Step 0 — Inspect and validate environment

1. Confirm the working directory is the intended new personal Kairn repo and examine tracked/untracked files before making changes. Read root `AGENTS.md` and scoped instructions; inspect all starter `docs/` pages and reconcile inconsistencies.
2. Check availability of Node **26 LTS**, npm, TypeScript tooling, git, and GitHub CLI (`gh`). If the exact runtime is unavailable, report and choose a supported LTS only with a documented reason; do not silently pretend Node 26 is installed.
3. Inspect `git status`, `git remote -v` and `gh auth status -h github.com`; retrieve `gh api user --jq .login`. **Before any remote write**, display the chosen login and account URL, verify personal ownership (and not an organization/company-managed identity). If uncertain, **pause only the remote-creation/push step** and ask which personal login to use. Do not put anything in an organization just because `gh` defaults there.
4. Verify whether `PERSONAL_LOGIN/kairn` already exists using `gh repo view`; if it exists, inspect it rather than overwriting/reinitializing it. If there are divergent contents, ask before publishing. If auth is unavailable, complete local phases and clearly report the blocker.
5. Choose stable package dependencies available in the environment. Prefer Node 26, TypeScript strict, native Node APIs, `@clack/prompts`, Vitest, ESLint (with appropriate TS setup and TSDoc lint), Prettier, markdownlint-cli2. Keep dependencies minimal and lock them with npm. Use no telemetry or cloud services.

## Step 1 — Build in phases; commit each phase independently

### Phase A — Baseline package and runnable executable

- Initialize Git on `main` only if needed; do not overwrite an existing git history.
- Create `package.json` with `bin` pointing to compiled executable, `type: module` if suitable, `engines.node`, scripts and `private`/publish settings appropriate to an unpublished OSS CLI.
- Set up strict TypeScript compilation and a real `kairn` entrypoint providing verified `--help` and `--version`. Ensure the built package can be executed via a local package link or equivalent smoke test.
- Use a focused commit such as `chore: bootstrap TypeScript CLI package`.

### Phase B — Open-source governance and documentation baseline

- Keep the supplied root and scoped `AGENTS.md` instructions, improving them only if they conflict with the actual structure.
- Create an accurate root `README.md` (working vs planned features clearly separated), `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md` if appropriate, MIT `LICENSE` (ensure correct copyright attribution rather than inventing a real person), `.gitignore`, and a compact PR template. Do not add fabricated contact emails or company examples.
- Update the documentation index and any links needed. Commit e.g. `docs: establish architecture and contribution standards`.

### Phase C — Engineering quality infrastructure

- Configure ESLint, Prettier, Vitest, strict `tsc`, and Markdown lint. Expose `typecheck`, `lint`, `format:check`, `test`, `build`, `docs:lint` scripts. Avoid excessive plugin or monorepo complexity.
- Add deterministic smoke tests for the CLI baseline. Ensure quality commands actually run. Commit e.g. `chore: add quality gates and test runner`.

### Phase D — Pure core implementation of documentation initialization

- In `src/core/`, implement a small, tested, non-interactive API that (a) detects a _direct_ `docs/` child in a selected directory, (b) computes a safe initialization plan, and (c) applies explicitly approved changes.
- Existing docs must never be overwritten. Repeated operation must be safe. Honor cancellation by making no change until the user confirms. Do not write outside the selected directory; guard dangerous paths and symlink edge cases.
- Keep all terminal prompts outside core. Return typed results that future CLI/server adapters can reuse. TSDoc non-obvious exported APIs.
- Add focused temporary-directory tests **in the same feature commit**, and update `docs/MODULE_CATALOG.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md` with verified truth. Commit e.g. `feat(core): safely discover and initialize documentation`.

### Phase E — Attractive Clack TUI

- Implement `kairn init` as an interactive, concise, well-branded wizard: show project directory; detect `docs/`; choose reuse/create/cancel as appropriate; preview writes; confirm; show success and next steps.
- Use Clack only in CLI. Handle cancellation, errors, `NO_COLOR`, non-TTY, and explicit `--yes` for safe noninteractive use (do not invoke a blocking prompt in CI). No prompts in the npm installation script.
- Add CLI tests with a prompt adapter/fakes and at least one built-binary smoke test; update CLI docs and README **in the same commit**. Commit e.g. `feat(cli): add interactive kairn init wizard`.

### Phase F — CI and verification

- Add GitHub Actions on pushes and PRs to run `npm ci`, typecheck, lint, format check, tests, build, Markdown lint. Minimal workflow permissions; no deployment and no secret-dependent tests. Pin actions to immutable SHAs if practical, and document how versions are managed.
- Commit e.g. `ci: enforce repository quality checks`.
- Finish concise `README` installation/development instructions and a phase-by-phase changelog in `docs/ROADMAP.md`; one final docs-only commit if changes are genuinely distinct, rather than bundling unrelated edits.

**After each phase:** inspect the staged diff and `git diff --check`, run relevant available checks, update the related docs, then make the topical commit. Do not accumulate all six phases into one commit. Do not commit generated build output or dependencies. Do not weaken checks to make them pass; explain and repair failures.

## Step 2 — Local end-to-end acceptance

Before publishing, perform and report the real checks:

- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm run format:check`
- `npm test`
- `npm run build`
- `npm run docs:lint`
- Installed/linked CLI smoke: `kairn --help`, `kairn --version`, and `kairn init` using an isolated temporary project.
- Confirm first init, existing docs, repeated init, cancellation and `--yes` behaviors.
- Check `git log --oneline --decorate`, `git status --short`, and the actual build/package entrypoint.

Never report a check as passed unless it ran. If a missing tool/network/auth prevents a check, document the specific blocker and proceed with the safe portions.

## Step 3 — Create my PERSONAL public GitHub repository and push

1. Re-run GitHub account checks immediately before publication. Determine `PERSONAL_LOGIN` from `gh api user --jq .login` and verify it is my personal account; never use an organization or employer owner. If login/account ownership is ambiguous, request confirmation instead of guessing.
2. Scan the complete staged/tracked repository history for secrets, real credentials, private internal content and sensitive company references. Do not publish unless safe.
3. Check that `PERSONAL_LOGIN/kairn` doesn't contain content that would be overwritten. Don't reset/force push.
4. Using the actual personal login, create the public remote from the local repository via the GitHub CLI (for example `gh repo create "${PERSONAL_LOGIN}/kairn" --public --source=. --remote=origin --push`, **only if compatible with the current CLI/manual and repository state**). A separate `git push -u origin main` is fine if needed. Keep every phase commit in history.
5. Verify remote owner and URL, branch, pushed commit hashes, and that the GitHub repo is public. Don't claim success if the remote operation fails.

## Final handoff (required)

Give a short table: phase, actual commit hash, implemented outcome, and checks. Provide the exact **personal** GitHub repository URL and branch if successfully pushed; otherwise say precisely why not. Summarize how to install/run `kairn init`, scope not yet implemented, and the smallest next milestone (`kairn run` local doc viewer). Do not ask to build the future UI in this task.
