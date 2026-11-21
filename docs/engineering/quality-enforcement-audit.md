# Kairn Repository-Wide Quality and Architectural Enforcement Audit

> **Status:** Completed and verified across all quality gates, static linters, and regression suites.
> **Scope:** Repository-wide audit of architectural boundaries, design-system control adoption, static analysis rules, CI pipelines, and automated test coverage.
> **Date:** 2026-11-21

---

## 1. Executive Summary

A comprehensive, evidence-driven code quality and architectural enforcement audit was conducted across the Kairn repository following the completion of Phase 6C (React Documentation Explorer). The audit inspected all codebase layers—Core domain logic, CLI commands, HTTP Loopback Server, retained Vanilla Viewer, and the React 19 Frontend SPA—evaluating existing architectural boundaries, reusable UI component patterns, and static quality enforcement.

### Key Audit Findings

1. **Architecture & Boundaries:** Kairn maintains strict unidirectional dependencies (`CLI -> Core & Server`, `Server -> Core`, `Viewer -> Core & Server`, `Frontend -> Safe Shared Contracts`). However, automated enforcement had gaps: `src/core/` only restricted React/frontend imports, omitting prohibitions against importing `server`, `cli`, or `viewer` modules. `src/server/`, `src/viewer/`, and `src/cli/` lacked codified ESLint import boundaries. Furthermore, `process.exit()` was not banned via static analysis in reusable library code despite being strictly forbidden by `AGENTS.md`.
2. **Design-System Adoption:** Kairn's Mineral design system establishes low-level primitives (`Button`, `TextInput`, `Select`, `Switch`) in `src/frontend/components/ui/`. Previously, ESLint banned `<input>` and `<select>` only in `src/frontend/features/` and `src/frontend/layouts/`. Due to ESLint flat configuration array replacement behavior, files in `src/frontend/app/` (e.g. `App.tsx`, `OverviewPage.tsx`) or other frontend directories only had `<button>` restricted, leaving `<input>`, `<select>`, and `<textarea>` completely unchecked.
3. **CI Budget Enforcement:** While `tests/frontend-assets.test.ts` verified production asset budgets during Vitest runs, the standalone audit script `scripts/measure-frontend.mjs` was not executed as an explicit gate in `.github/workflows/ci.yml`.

### Actions Taken

- Codified watertight ESLint restrictions across all frontend directories, disallowing raw `<button>`, `<input>`, `<select>`, `<textarea>`, and inline `style` attributes, with precise exemptions granted only to the implementing UI primitive components (`Button.tsx`, `TextInput.tsx`, `Select.tsx`, `Switch.tsx`).
- Codified subsystem import boundaries and banned `process.exit()` across `src/core/`, `src/server/`, `src/viewer/`, and `src/cli/`.
- Integrated `node scripts/measure-frontend.mjs` directly into GitHub Actions CI workflow after build.
- Extended `tests/frontend-architecture.test.ts` with comprehensive positive and negative validation matrices verifying that non-conforming code is caught while approved primitives and standard semantic HTML pass cleanly.
- Verified all quality gates: 201 Vitest tests pass across 40 test files; 8 Playwright browser tests pass; TypeCheck, Lint, FormatCheck, and DocsLint all pass.

---

## 2. Repository Architecture Findings

Kairn is a local-first Markdown documentation and Git-history explorer built on Node.js 26 LTS baseline with TypeScript in strict mode. The codebase is organized into five well-defined subsystems:

```text
src/
  ├── core/        Pure domain logic: path validation, document discovery, Markdown analysis, search indexing (SQLite FTS5)
  ├── cli/         CLI commands, Clack interactive prompts, lifecycle management, error formatting
  ├── server/      Loopback HTTP server (127.0.0.1) exposing JSON endpoints and static assets
  ├── viewer/      Vanilla browser assets and reader (Phases 1-5 retained baseline at `/`)
  ├── frontend/    React 19 SPA Documentation Explorer at `/app` (Mineral design system, Tailwind v4, React Router v8)
  └── index.ts     CLI executable entrypoint setting process.exitCode
```

### Subsystem Boundaries & Invariants

| Subsystem       | Intended Role                                              | Permitted Dependencies                                                                            | Forbidden Dependencies                                                                                       |
| :-------------- | :--------------------------------------------------------- | :------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------- |
| `src/core/`     | Reusable domain logic, filesystem algorithms, SQLite index | Node built-ins, `zod`, `markdown-it`, internal core modules                                       | `react`, `react-dom`, `frontend/**`, `server/**`, `cli/**`, `viewer/**`, `process.exit()`                    |
| `src/server/`   | Loopback HTTP adapter (127.0.0.1)                          | Node built-ins, `src/core/` contracts                                                             | `react`, `frontend/**`, `cli/**`, `viewer/**`, `process.exit()`                                              |
| `src/viewer/`   | Retained vanilla reader and renderer                       | Node built-ins, `src/core/`, `src/server/frontend-assets.js`                                      | `react`, `frontend/**`, `cli/**`, `process.exit()`                                                           |
| `src/cli/`      | Command line interface and prompts                         | Node built-ins, `@clack/prompts`, `src/core/`, `src/server/`                                      | `react`, `frontend/**`, `process.exit()`                                                                     |
| `src/frontend/` | React 19 documentation explorer SPA                        | `react`, `react-dom/client`, `react-router`, `lucide-react` (via registry), shared core contracts | `node:*`, Node built-ins, `fs`, `path`, `sqlite`, `server/**`, `cli/**`, `viewer/**`, raw HTML form controls |

---

## 3. Existing Quality Infrastructure

Kairn possesses a robust multi-tiered testing and verification infrastructure:

1. **Type Checking:** `npm run typecheck` (`tsc --noEmit && tsc -p tsconfig.frontend.json && tsc -p tsconfig.tools.json`) validates strict TypeScript across Node, frontend, and build tool configurations.
2. **Linting & Documentation:** `npm run lint` (`eslint .`) using ESLint 10 with `typescript-eslint`, `eslint-plugin-tsdoc` (syntax validation for JSDoc/TSDoc comments), and `eslint-plugin-react-hooks`. `npm run docs:lint` (`markdownlint-cli2`) validates 30 project Markdown documents against repository rules.
3. **Code Formatting:** `npm run format:check` (`prettier --check .`) enforces code style across all tracked files. `.gitattributes` guarantees LF line endings on all operating systems.
4. **Unit & Integration Testing:** `npm test` (`npm run build && vitest run`) executes 40 test suites in parallel with isolated temporary directory fixtures and loopback HTTP ports.
5. **Browser & Visual Regression:** `npm run test:browser` (`playwright test`) validates headless Chromium browser behavior, WCAG 2.1 AA accessibility via `@axe-core/playwright`, keyboard navigation, and pixel snapshots on macOS.
6. **Asset Budget Enforcement:** `scripts/measure-frontend.mjs` and `tests/frontend-assets.test.ts` validate bundled frontend asset constraints:
   - Max asset count: 32 (actual: 21)
   - Max single asset size: 2 MiB (actual largest: 238.7 KB `index-sz9-JdyG.js`)
   - Max total loaded size: 8 MiB (actual: 460.3 KB)
7. **CI Quality Gates:** `.github/workflows/ci.yml` executes all checks on pushes and pull requests across a multi-OS matrix (`ubuntu-latest`, `macos-latest`, `windows-latest`) using Node 26.

---

## 4. Design-System Component Inventory

Kairn's Mineral design system is implemented in `src/frontend/components/ui/` using CSS tokens (`tokens.css`), semantic themes (`themes.css`), Tailwind v4 utility classes (`@theme inline`), and component CSS (`components.css`).

### Inventory of UI Primitives and Composites

| Component        | Path                                          | Wrapped Element                | Architectural Classification | Usage Scope                                                                     |
| :--------------- | :-------------------------------------------- | :----------------------------- | :--------------------------- | :------------------------------------------------------------------------------ |
| `Button`         | `src/frontend/components/ui/Button.tsx`       | `<button>`                     | **Adopted Primitive**        | Universal button primitive; renders solid, outline, ghost, destructive variants |
| `IconButton`     | `src/frontend/components/ui/IconButton.tsx`   | `Button`                       | Composite                    | Semantic icon button wrapping `Button` and `Icon`                               |
| `TextInput`      | `src/frontend/components/ui/TextInput.tsx`    | `<input type="text\|search">`  | **Adopted Primitive**        | Text and search input primitive with label, hint, error states                  |
| `Select`         | `src/frontend/components/ui/Select.tsx`       | `<select>`                     | **Adopted Primitive**        | Accessible dropdown select primitive with Mineral styling                       |
| `Switch`         | `src/frontend/components/ui/Switch.tsx`       | `<input type="checkbox">`      | **Adopted Primitive**        | Toggle switch primitive with accessible role                                    |
| `Field`          | `src/frontend/components/ui/Field.tsx`        | Semantic `<label>`, `<p>`      | Composite Primitive          | Form field container managing labels, descriptions, and error text              |
| `Badge`          | `src/frontend/components/ui/Presentation.tsx` | `<span>`                       | Primitive                    | Status badge, project chip, and metadata counter                                |
| `Card`           | `src/frontend/components/ui/Presentation.tsx` | `<div>`                        | Primitive                    | Surface container with token borders and elevated background                    |
| `Divider`        | `src/frontend/components/ui/Presentation.tsx` | `<hr>`                         | Primitive                    | Accessible structural separator                                                 |
| `SectionHeading` | `src/frontend/components/ui/Presentation.tsx` | `<div>` / `<h2>`               | Primitive                    | Section header with optional action button slot                                 |
| `Tabs`           | `src/frontend/components/ui/Tabs.tsx`         | `Button`                       | Composite                    | Tab bar primitive with ARIA `tablist` and `tab` roles                           |
| `SidebarItem`    | `src/frontend/components/ui/SidebarItem.tsx`  | `Button`                       | Composite                    | Navigational button item for sidebar navigation                                 |
| `Breadcrumbs`    | `src/frontend/components/ui/Breadcrumbs.tsx`  | `<nav>`, `<ol>`, `<li>`, `<a>` | Composite                    | Accessible navigational breadcrumb path                                         |
| `DocCallout`     | `src/frontend/components/ui/DocCallout.tsx`   | `<div>`, `Icon`                | Composite                    | Callout banner for warnings, hints, and error alerts                            |
| `Settings`       | `src/frontend/components/ui/Settings.tsx`     | `<div>`, `Card`, `Switch`      | Composite                    | Setting section and row container                                               |
| `Icon`           | `src/frontend/icons/Icon.tsx`                 | Lucide SVG via registry        | Primitive                    | Controlled icon renderer via semantic icon tokens                               |

### Legitimate Semantic HTML Permitted in Features and Layouts

The following HTML elements are intentionally permitted outside `components/ui/` because they provide essential semantic structure rather than form input:

- Semantic structural landmarks: `<header>`, `<nav>`, `<aside>`, `<main>`, `<article>`, `<section>`, `<footer>`
- Headings: `<h1>`, `<h2>`, `<h3>`, `<h4>`, `<h5>`, `<h6>` (e.g. in Markdown prose and page headers)
- Typography and grouping: `<p>`, `<span>`, `<div>`, `<ul>`, `<ol>`, `<li>`, `<hr>`
- Keyboard indicators: `<kbd>` (used in `SearchTrigger.tsx` and `SearchPaletteDialog.tsx`)
- Media: `<picture>`, `<img>`, `<svg>` (used for branded SVG logos and icons)
- Modals: `<dialog>` (used in `SearchPaletteDialog.tsx` for accessible dialog container)
- Hyperlinks: `<a>` for in-page `#fragment` jumps in `DocOutline.tsx` and external reader exit in `Header.tsx`

---

## 5. Gap Analysis

| Area                       | Existing Mechanism                    | Location           | Gap Identified                                                                                                                                                                                               | Severity   |
| :------------------------- | :------------------------------------ | :----------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------- |
| **Frontend Form Controls** | ESLint `no-restricted-syntax`         | `eslint.config.js` | Restricted `<input>` and `<select>` only in `features/` and `layouts/`. `src/frontend/app/` (e.g. `App.tsx`, `OverviewPage.tsx`) was not covered. `<textarea>` was unconstrained across the entire frontend. | **Medium** |
| **Inline Styles**          | ESLint `no-restricted-syntax`         | `eslint.config.js` | Checked in parts of frontend, but due to rule overwriting in flat config, could be bypassed in certain configurations.                                                                                       | **Low**    |
| **Process Exits**          | `AGENTS.md` prose instruction         | `AGENTS.md`        | "Never call `process.exit()` from reusable core code" was stated in prose, but not statically enforced via ESLint or tests.                                                                                  | **Medium** |
| **Core Boundary**          | ESLint `no-restricted-imports`        | `eslint.config.js` | Banned React and frontend, but did not ban `server/`, `cli/`, or `viewer/` imports in `src/core/`.                                                                                                           | **Medium** |
| **Server Boundary**        | Implicit convention                   | N/A                | No ESLint rule preventing `src/server/` from importing `cli/`, `viewer/`, or `frontend/`.                                                                                                                    | **Medium** |
| **Viewer Boundary**        | Implicit convention                   | N/A                | No ESLint rule preventing `src/viewer/` from importing `cli/` or `frontend/`.                                                                                                                                | **Low**    |
| **CLI Boundary**           | Implicit convention                   | N/A                | No ESLint rule preventing `src/cli/` from importing React or `frontend/`.                                                                                                                                    | **Low**    |
| **CI Asset Budget**        | Script `scripts/measure-frontend.mjs` | `scripts/`         | Script existed and passed locally, but was not invoked as an independent step in `.github/workflows/ci.yml`.                                                                                                 | **Low**    |

---

## 6. Implementation Decisions

1. **Flat Config Rule Isolation:** In ESLint flat configuration, `no-restricted-syntax` options are replaced rather than merged across matching blocks. To prevent rule shadowing, frontend rules were restructured:
   - One universal block targets `src/frontend/**/*.{ts,tsx}` excluding the four primitive files (`Button.tsx`, `TextInput.tsx`, `Select.tsx`, `Switch.tsx`), banning `<button>`, `<input>`, `<select>`, `<textarea>`, `style`, and `process.exit()`.
   - Four dedicated blocks target each primitive individually, permitting its specific wrapped element while banning all others and inline styles.
2. **Subsystem Layer Boundaries:**
   - `src/core/**/*.ts`: Restricted from importing `react`, `react/*`, `react-dom`, `react-dom/*`, `**/frontend/**`, `**/server/**`, `**/cli/**`, and `**/viewer/**`. Banned from calling `process.exit()`.
   - `src/server/**/*.ts`: Restricted from importing `react`, `react/*`, `react-dom`, `react-dom/*`, `**/frontend/**`, `**/cli/**`, and `**/viewer/**`. Banned from calling `process.exit()`.
   - `src/viewer/**/*.ts`: Restricted from importing `react`, `react/*`, `react-dom`, `react-dom/*`, `**/frontend/**`, and `**/cli/**`. Banned from calling `process.exit()`.
   - `src/cli/**/*.ts`: Restricted from importing `react`, `react/*`, `react-dom`, `react-dom/*`, and `**/frontend/**`. Banned from calling `process.exit()`.
3. **CI Pipeline Enhancement:** Added `- run: node scripts/measure-frontend.mjs` immediately following `npm run build` in `.github/workflows/ci.yml` so that asset budget headroom is verified across all OS runners in CI.
4. **Architectural Test Expansion:** Added tests to `tests/frontend-architecture.test.ts` to execute ESLint against programmatic probe files verifying positive cases (approved primitives, semantic HTML) and negative cases (forbidden controls, cross-layer imports, `process.exit`).

---

## 7. Changed Files

| File                                            | Change Description                                                                                                                     |
| :---------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| `eslint.config.js`                              | Configured watertight `no-restricted-syntax` and `no-restricted-imports` across frontend layers and core/server/viewer/cli subsystems. |
| `.github/workflows/ci.yml`                      | Added explicit step `node scripts/measure-frontend.mjs` to the CI workflow.                                                            |
| `tests/frontend-architecture.test.ts`           | Added comprehensive positive and negative test cases verifying control adoption, semantic HTML permission, and subsystem boundaries.   |
| `docs/TESTING.md`                               | Documented the quality and architectural enforcement audit results and test counts.                                                    |
| `docs/ARCHITECTURE.md`                          | Documented automated enforcement of module boundaries and design system adoption.                                                      |
| `docs/engineering/quality-enforcement-audit.md` | Created the comprehensive repository-wide audit report.                                                                                |

---

## 8. Verification Matrix

| Check                        | Valid Case Passes                                                                                           | Invalid Case Fails                                                                                    | Evidence                                                        | Status       |
| :--------------------------- | :---------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------- | :----------- |
| **Button Primitive**         | `<button>` in `Button.tsx` passes linting                                                                   | `<button>` in `app/`, `features/`, `layouts/`, `components/ui/CustomWidget.tsx` triggers ESLint error | `tests/frontend-architecture.test.ts`                           | **VERIFIED** |
| **TextInput Primitive**      | `<input>` in `TextInput.tsx` passes linting                                                                 | `<input>` in `app/`, `features/`, `layouts/`, `components/ui/CustomWidget.tsx` triggers ESLint error  | `tests/frontend-architecture.test.ts`                           | **VERIFIED** |
| **Select Primitive**         | `<select>` in `Select.tsx` passes linting                                                                   | `<select>` in `app/`, `features/`, `layouts/`, `components/ui/CustomWidget.tsx` triggers ESLint error | `tests/frontend-architecture.test.ts`                           | **VERIFIED** |
| **Switch Primitive**         | `<input type="checkbox">` in `Switch.tsx` passes linting                                                    | `<input>` in non-primitive UI triggers ESLint error                                                   | `tests/frontend-architecture.test.ts`                           | **VERIFIED** |
| **Textarea Restriction**     | N/A (no primitive yet)                                                                                      | `<textarea>` anywhere in `src/frontend/` triggers ESLint error                                        | `tests/frontend-architecture.test.ts`                           | **VERIFIED** |
| **Inline Style Restriction** | Semantic CSS classes pass linting                                                                           | `style={{ ... }}` anywhere in `src/frontend/` triggers ESLint error                                   | `tests/frontend-architecture.test.ts`                           | **VERIFIED** |
| **Semantic HTML Elements**   | `<header>`, `<nav>`, `<main>`, `<article>`, `<h1>`, `<dialog>`, `<kbd>` pass                                | N/A                                                                                                   | `tests/frontend-architecture.test.ts`                           | **VERIFIED** |
| **Core Boundary**            | Core imports `library.js`, `storage.js`, `zod`, node builtins                                               | Core importing `server`, `cli`, `viewer`, `frontend`, or `react` triggers ESLint error                | `tests/frontend-architecture.test.ts`                           | **VERIFIED** |
| **Server Boundary**          | Server imports `../core/*`, `./frontend-assets.js`                                                          | Server importing `cli`, `viewer`, `frontend`, or `react` triggers ESLint error                        | `tests/frontend-architecture.test.ts`                           | **VERIFIED** |
| **Viewer Boundary**          | Viewer imports `../core/*`, `../server/frontend-assets.js`                                                  | Viewer importing `cli`, `frontend`, or `react` triggers ESLint error                                  | `tests/frontend-architecture.test.ts`                           | **VERIFIED** |
| **CLI Boundary**             | CLI imports `../core/*`, `../server/*`, `@clack/prompts`                                                    | CLI importing `frontend` or `react` triggers ESLint error                                             | `tests/frontend-architecture.test.ts`                           | **VERIFIED** |
| **Process Exit Ban**         | Setting `process.exitCode` in `src/index.ts` passes                                                         | `process.exit()` in `core/`, `server/`, `viewer/`, `cli/`, or `frontend/` triggers ESLint error       | `tests/frontend-architecture.test.ts`                           | **VERIFIED** |
| **Asset Budget Enforcement** | Production build passes asset count (21 ≤ 32), single file size (238 KB ≤ 2 MB), total size (460 KB ≤ 8 MB) | Over-budget build fails with code 1                                                                   | `scripts/measure-frontend.mjs`, `tests/frontend-assets.test.ts` | **VERIFIED** |

---

## 9. Commands and Results

| Command                             | Exit Code | Summary Output / Metric                                                                                                  | Status   |
| :---------------------------------- | :-------- | :----------------------------------------------------------------------------------------------------------------------- | :------- |
| `npm run typecheck`                 | 0         | Strict TypeScript compilation succeeded without errors across Node, frontend, and build configs.                         | **PASS** |
| `npm run lint`                      | 0         | ESLint validated all source files, rules, and TSDoc syntax cleanly with 0 errors and 0 warnings.                         | **PASS** |
| `npm run format:check`              | 0         | Prettier verified formatting across all repository source and docs cleanly.                                              | **PASS** |
| `npm test`                          | 0         | 40 test suites passed, 201 tests passed (0 failed, 0 skipped). Execution time: 6.49s.                                    | **PASS** |
| `npm run docs:lint`                 | 0         | Markdownlint validated 30 Markdown files with 0 issues.                                                                  | **PASS** |
| `npm run test:browser`              | 0         | 8 Playwright browser tests passed (23.1s), verifying WCAG 2.1 AA accessibility, keyboard control, and visual regression. | **PASS** |
| `node scripts/measure-frontend.mjs` | 0         | Asset budget verified: 21 assets (limit 32), largest 238.7 KB (limit 2 MB), total 460.3 KB (limit 8 MB).                 | **PASS** |

---

## 10. Remaining Risks

1. **Dynamic AST Construction:** ESLint static analysis inspects JSX tags directly (`JSXOpeningElement[name.name='button']`). If an author were to dynamically alias `React.createElement("button", ...)`, ESLint syntax selectors would not match. However, Kairn's strict TypeScript conventions and code review processes prevent arbitrary dynamic element generation.
2. **Third-Party Dependency Transitive HTML:** If a third-party npm component were introduced into `src/frontend/`, that component's internal markup would not be scanned by repository ESLint rules. To mitigate this risk, `tests/frontend-architecture.test.ts` strictly validates that only approved packages (`react`, `react-dom/client`, `react-router`, `lucide-react`) are imported by frontend code.
3. **OS-Specific Playwright Snapshots:** Visual pixel snapshot comparison is intentionally limited to `darwin` (macOS) in `tests/browser/foundation.spec.ts` due to platform font rendering differences. Behavioral, functional, and accessibility (axe-core) tests execute unconditionally on Linux, macOS, and Windows in CI.

---

## 11. Manual Verification Guide

To independently reproduce and verify the architectural and quality checks:

### Step 1: Run Full Automated Quality Suite

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run docs:lint
npm run test:browser
node scripts/measure-frontend.mjs
```

All commands must exit with code 0.

### Step 2: Verify Negative Enforcement (Probing Design-System Violations)

1. Create a temporary probe file violating component adoption in `src/frontend/app/Probe.tsx`:

   ```tsx
   export const BadComponent = () => <button>Click me</button>;
   ```

2. Run `npm run lint`:

   ```bash
   npx eslint src/frontend/app/Probe.tsx
   ```

   **Expected Result:** ESLint flags an error: `Use the shared Button or IconButton primitive. (no-restricted-syntax)`.

3. Delete the temporary probe file:

   ```bash
   rm src/frontend/app/Probe.tsx
   ```

### Step 3: Verify Negative Enforcement (Probing Subsystem Boundaries)

1. Create a temporary probe file violating core boundaries in `src/core/probe.ts`:

   ```ts
   import { runProjectCommand } from "../cli/project.js";
   export const leak = runProjectCommand;
   ```

2. Run `npm run lint`:

   ```bash
   npx eslint src/core/probe.ts
   ```

   **Expected Result:** ESLint flags an error: `Core cannot import React, frontend, server, CLI, or viewer modules. (no-restricted-imports)`.

3. Delete the temporary probe file:

   ```bash
   rm src/core/probe.ts
   ```

### Step 4: Verify Negative Enforcement (Probing `process.exit` Prohibition)

1. Create a temporary probe file calling `process.exit` in `src/server/probe.ts`:

   ```ts
   export function terminate(): void {
     process.exit(1);
   }
   ```

2. Run `npm run lint`:

   ```bash
   npx eslint src/server/probe.ts
   ```

   **Expected Result:** ESLint flags an error: `Never call process.exit() from server modules. (no-restricted-syntax)`.

3. Delete the temporary probe file:

   ```bash
   rm src/server/probe.ts
   ```

---

## 12. Final Assessment

The Kairn repository now has an exhaustive, automated quality and architectural enforcement system. Boundary rules between domain logic, CLI adapters, loopback servers, and frontend code are strictly enforced at lint and test time. Design-system controls are rigorously adopted across all frontend layers without false positives on legitimate semantic HTML or primitive implementations. Asset budgets and cross-platform accessibility gates ensure performance and usability standards are preserved continuously.
