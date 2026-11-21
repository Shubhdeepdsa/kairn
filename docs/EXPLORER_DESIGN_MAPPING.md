# Kairn Documentation Explorer — Design-to-Architecture Mapping

Status: Phase 6C-0 reference audit and visual architecture specification.
Canonical reference sources: Stitch Project 8112911233485003001, `designs/design.md`, `designs/reference-code/`, and `.designs-archive/all-38-screens/`.

---

## 1. Screen & Reference Catalog

The repository and local design archives contain 38 rendered PNG screen captures, 6 canonical high-resolution mockups in `designs/screenshots/`, 26 standalone HTML reference screens, and 6 standalone SVG brand assets in `designs/reference-code/`.

### 1.1 Complete Design Inventory & Classification

| Artifact Name                                              | Formats & Locations                                                                                                                                                         | Dimensions                            | Classification         | Explorer Relevance                                                                                                                                                          |
| :--------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------ | :--------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Documentation Explorer (Canonical)**                     | `designs/screenshots/documentation-explorer.png`; `.designs-archive/all-38-screens/ui-documentation-explorer.png`; `designs/reference-code/ui-documentation-explorer.html`  | 1280 × 2724 px (HTML: 33,331 B)       | **Canonical Screen**   | **Primary target for Phase 6C.** 3-region documentation explorer with tree navigation, reading column, and table-of-contents outline.                                       |
| **Documentation Explorer (Rich Marketing Backend Sample)** | `.designs-archive/all-38-screens/ui-documentation-explorer-marketing-backend-sample.png`; `designs/reference-code/ui-documentation-explorer-marketing-backend-sample.html`  | 1280 × 2781 px (HTML: 44,884 B)       | **Reference Specimen** | **Primary specimen for component patterns:** multi-tab view navigation, instrument-grade SVG topology diagrams, SLA comparison tables, syntax-highlighted Kafka code block. |
| **Documentation Explorer (Early Baseline Archive)**        | `.designs-archive/all-38-screens/ui-documentation-explorer-v1-archive.png`; `designs/reference-code/ui-documentation-explorer-v1-archive.html`                              | 1280 × 2780 px (HTML: 33,362 B)       | Historical Baseline    | Historical precursor to canonical view; superseded by `ui-documentation-explorer.html`.                                                                                     |
| **Explorer Header Snippet**                                | `.designs-archive/all-38-screens/reference-doc-explorer-header.png`                                                                                                         | 1150 × 235 px                         | Image-Only Snippet     | Cropped inspection detail of top bar, project switcher, and search trigger.                                                                                                 |
| **Explorer Reading View Snippet**                          | `.designs-archive/all-38-screens/reference-doc-explorer-reading-view.png`                                                                                                   | 820 × 479 px                          | Image-Only Snippet     | Cropped inspection detail of reading column typography and callout directive box.                                                                                           |
| **Project Details Form Snippet**                           | `.designs-archive/all-38-screens/reference-project-details-form.png`                                                                                                        | 784 × 284 px                          | Image-Only Snippet     | Cropped detail of project metadata card.                                                                                                                                    |
| **Library & Projects Workspace**                           | `designs/screenshots/library.png`; `.designs-archive/all-38-screens/ui-library-and-projects-workspace.png`; `designs/reference-code/ui-library-and-projects-workspace.html` | 1280 × 1402 px (HTML: 12,018 B)       | Future Composition     | Multi-project library workspace (Phase 6D+). Shared components must remain compatible.                                                                                      |
| **Git History Explorer**                                   | `designs/screenshots/git-history-explorer.png`; `.designs-archive/all-38-screens/ui-git-history-explorer.png`; `designs/reference-code/ui-git-history-explorer.html`        | 1280 × 1166 px (HTML: 43,006 B)       | Future Composition     | Git commit timeline and visual diff inspector (Phase 7). Shared chrome must remain compatible.                                                                              |
| **Add Project Discovery Flow**                             | `designs/screenshots/add-project.png`; `.designs-archive/all-38-screens/ui-add-project-discovery.png`; `designs/reference-code/ui-add-project-discovery.html`               | 1280 × 1040 px (HTML: 19,899 B)       | Future Composition     | Modal dialog for registering documentation roots. Shared dialog primitives must remain compatible.                                                                          |
| **Global Settings Suite (10 Screens)**                     | `designs/screenshots/global-settings.png`; `.designs-archive/all-38-screens/global-settings-*.png`; `designs/reference-code/global-settings-*.html`                         | 1280 × 1040 to 2560 × 2912 px         | Future Composition     | Appearance, Reading, Application CLI, Git defaults, Library workspace, Search, Privacy, Diagnostics settings modals.                                                        |
| **Project Settings Suite (6 Screens)**                     | `designs/screenshots/project-settings.png`; `.designs-archive/all-38-screens/project-settings-*.png`; `designs/reference-code/project-settings-*.html`                      | 1280 × 1024 to 1280 × 1519 px         | Future Composition     | General, Navigation, Sources, Visibility/Ignore, Git binding, and Advanced markdown settings pages.                                                                         |
| **Brand Showcases & Specimen Pages (4 Screens)**           | `.designs-archive/all-38-screens/specimen-*.png`; `designs/reference-code/specimen-*.html`                                                                                  | 1280 × 5339 to 2560 × 10162 px        | Design System Specimen | Brand asset kit, 4-direction identity comparison, Mineral Precision style guide, marketing specimen.                                                                        |
| **Marketing & Social Banners (4 Banners)**                 | `.designs-archive/all-38-screens/marketing-*.png`                                                                                                                           | 1024 × 1024 to 1376 × 768 px          | Image-Only Asset       | GitHub Readme hero, newsletter header, social cards. Out of scope for application bundle.                                                                                   |
| **Approved Brand Logos (3 Marks × SVG/PNG)**               | `designs/logos/approved/` & `src/frontend/assets/brand/`                                                                                                                    | Vector SVG + 240 × 240 / 640 × 160 px | Production Brand Art   | Final approved vector Cairn Mark, App Icon, and Horizontal System Lockup. In production use.                                                                                |

---

## 2. Auditable Visual Specification

Extracted directly from canonical reference code [`designs/reference-code/ui-documentation-explorer.html`](file:///Users/shubhdeepdas/Documents/Code/kairn/designs/reference-code/ui-documentation-explorer.html) and verified against [`designs/screenshots/documentation-explorer.png`](file:///Users/shubhdeepdas/Documents/Code/kairn/designs/screenshots/documentation-explorer.png):

### 2.1 Shell Geometry & Panel Widths

| Region                        | Stitch Measurement                                                                                      | Mineral Token Equivalent                                                                                      | Role & Behavior                                                                                                                                                                                        |
| :---------------------------- | :------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Top Application Header**    | Height: `54px`; Padding: `0 24px` (`px-6`)                                                              | Height: `3.5rem` (`56px`) / `3.375rem` (`54px`); Token: `--kairn-header-height`                               | Sticky/fixed top header. Houses brand lockup, project breadcrumb/switcher, centered search palette trigger (`⌘K`), theme & settings action icons.                                                      |
| **Left Navigation Sidebar**   | Width: `268px`; Padding: `16px 14px` (`px-3.5 py-4`)                                                    | Width: `16.75rem` (`268px`); Token: `--kairn-sidebar-width` (adjusted from 15rem)                             | Fixed/sticky full-height navigation pane. Contains project navigation items (Documentation, Git History, Settings), hairline divider, hierarchical doc tree, additional sources, and bottom sync tray. |
| **Central Reading Column**    | Max Width: `820px`; Article Max Width: `760px`; Padding: `32px 32px 96px` (`px-8 pb-24 pt-5`)           | Max Width: `52rem` (`832px`); Token: `--kairn-reading-width`; Padding: `--kairn-space-8`                      | Centered fluid reading plane. Contains document breadcrumbs, copy action, title header, metadata badge line, lead paragraph, callout directives, prose sections, and prev/next links.                  |
| **Right Outline / TOC Panel** | Width: `190px`; Top Offset: `78px` (`sticky top-[78px]`); Padding: `20px 24px 0 8px` (`pr-6 pl-2 pt-5`) | Width: `12rem` (`192px`); Sticky top offset: calc(header + space); Media: visible on `>= 1280px` (`xl:block`) | Sticky on-page document outline. Contains "ON THIS PAGE" uppercase tracking label, collapse action, and hierarchy list with active waypoint indicators.                                                |

### 2.2 Typography Hierarchy

| Element                        | Reference Font & Role                   | CSS Scale & Properties                                                         | Token Mapping                                     |
| :----------------------------- | :-------------------------------------- | :----------------------------------------------------------------------------- | :------------------------------------------------ |
| **Document H1 Title**          | Syne Bold (`font-headline font-bold`)   | `36px` font size, `44px` line-height, `-0.02em` tracking                       | `--kairn-font-display`, `--kairn-display-large`   |
| **Section H2 Headings**        | Syne Bold (`font-headline font-bold`)   | `26px` font size, `34px` line-height, tracking-tight                           | `--kairn-font-display`, `--kairn-display-medium`  |
| **Subsection H3 Headings**     | Syne Bold or Plus Jakarta Sans SemiBold | `18px` font size, `26px` line-height                                           | `--kairn-font-display`, `--kairn-heading-section` |
| **Body Lead Paragraph**        | Plus Jakarta Sans Regular               | `16px` font size, `27px` line-height, color `#374151` (Light)                  | `--kairn-font-body`, `--kairn-line-body`          |
| **Standard Body Paragraph**    | Plus Jakarta Sans Regular               | `15px` font size, `25px` line-height, color `#374151` (Light)                  | `--kairn-font-body`, `--kairn-text-body`          |
| **Breadcrumbs & Metadata**     | IBM Plex Mono Regular / Medium          | `11px` / `12px` font size, line-height `1.5`, uppercase tracking where labeled | `--kairn-font-code`, `--kairn-caption`            |
| **Tree Navigation Item**       | Plus Jakarta Sans Medium                | `13px` font size, line-height `20px`                                           | `--kairn-font-body`, `--kairn-text-small`         |
| **TOC Item (Active / Normal)** | Plus Jakarta Sans Medium / Regular      | `13px` font size (sub-items `12px`)                                            | `--kairn-font-body`, `--kairn-text-small`         |
| **Code Blocks & Inline Code**  | IBM Plex Mono Regular                   | `13px` font size, line-height `1.6`, dark terminal background `#20282E`        | `--kairn-font-code`, `--kairn-code-surface`       |

### 2.3 Color Tokens & Visual Signatures

| Element                         | Stitch Reference Value                                                   | Kairn Mineral Token                                          | Semantics & Contrast                                                                              |
| :------------------------------ | :----------------------------------------------------------------------- | :----------------------------------------------------------- | :------------------------------------------------------------------------------------------------ |
| **Active Document Indicator**   | Left bar: `3px` width, `rounded-full`, `#E4D13A`                         | `--kairn-wayfinding-width` (`3px`), `--kairn-accent`         | Wayfinding anchor: 3px rounded yellow vertical bar positioned along active tree item left border. |
| **Active Node Dot**             | `w-1.5 h-1.5 rounded-full bg-[#E4D13A]`                                  | `6px` circular badge, `--kairn-accent`                       | Secondary active indicator dot placed on tree item right edge and active TOC item left edge.      |
| **Selected Tree Item BG**       | `#F4F6F7` (Light) / subtle dark container                                | `--kairn-surface-hover` / `--kairn-surface-selected`         | Subtle container fill distinguishing the active document row from adjacent tree items.            |
| **Architectural Directive Box** | `#F8FAFB` background, `#E5E7EB` border, `3px` solid `#E4D13A` left edge  | `--kairn-surface-subtle`, `--kairn-border`, `--kairn-accent` | Instrument-grade callout banner with left accent waypoint border and directive badge.             |
| **Hairline Dividers**           | `1px solid #E5E7EB` / `#DCE1E5`                                          | `--kairn-border` / `--kairn-border-subtle`                   | Fine structural boundaries separating project nav, tree, additional sources, and panels.          |
| **Search Input Trigger**        | `h-8 bg-[#F8FAFB] border-[#E5E7EB] rounded-md` with `⌘K` badge           | `--kairn-input`, `--kairn-radius`, `--kairn-control-border`  | Global shortcut affordance opening the keyboard-navigable Search Palette.                         |
| **Prev / Next Cards**           | `p-4 rounded-lg bg-white border border-[#E5E7EB] hover:border-[#20282E]` | `--kairn-card`, `--kairn-radius`, hover transition           | Understated 2-column card grid at document footer for sequential reader navigation.               |

---

## 3. Responsive 3-Region Structure Grounded in References

```text
+---------------------------------------------------------------------------------------------------------+
| Top Application Header (Fixed, h=54px / 3.5rem): Brand Lockup | Project Switcher | [⌘K Search] | Theme  |
+--------------------+---------------------------------------------------------------+--------------------+
| Left Navigation    | Central Reading Plane                                         | Right Outline TOC  |
| Sidebar (268px)    | (Max-width 820px / 52rem, centered)                           | (190px / 12rem)    |
|                    |                                                               |                    |
| - Project Switcher | - Breadcrumb Navigation ("marketing / docs / architecture")   | - "ON THIS PAGE"   |
| - Workspace Nav    | - Document Title (H1 Syne 36px/44px) + Metadata & History     | - Jump List        |
| - Hairline Divider | - Lead Paragraph (Plus Jakarta Sans 16px/27px)                | - Active Waypoint  |
| - Doc Tree (Hier.) | - Directive Callout Box (Titanium bg, 3px yellow border)      | - Nested Headings  |
|   * Folder Group   | - Safe Markdown Body (.kairn-prose rendered HTML)             |                    |
|   * Active File    |   * Headings with fragment IDs                                | (Hidden on view-   |
|   * Nested Files   |   * Instrument SVG Diagrams / Tables / Figures                |  ports < 1280px)   |
| - Additional Srcs  |   * Terminal-grade Code Blocks (IBM Plex Mono 13px)           |                    |
| - Sync / Git Tray  | - Related Waypoints / Cross-References                        |                    |
|                    | - Previous / Next Article Navigation Cards (2-col grid)       |                    |
+--------------------+---------------------------------------------------------------+--------------------+
```

### 3.1 Breakpoint & Reflow Rules

- **Desktop Extra-Wide (`>= 1280px` / `xl`):** Complete 3-region presentation. Navigation sidebar (268px), reading column (flex-1, max 820px centered), and right outline (190px sticky).
- **Desktop / Laptop (`>= 768px` and `< 1280px` / `md` to `lg`):** 2-region presentation. Navigation sidebar (268px) and reading column. The right outline TOC collapses or is accessible via heading jump drawer.
- **Mobile (`< 768px` / `< 48rem`):** 1-region presentation. Top header collapses brand wordmark to compact mark; navigation sidebar collapses into standard accessible disclosure drawer (`Sidebar` toggle); reading column occupies full width with responsive padding (`px-4`).

---

## 4. Component Inventory & Ownership

| Component                   | Status             | Location                                            | Contract & Responsibilities                                                                                                                                       |
| :-------------------------- | :----------------- | :-------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`AppShell`**              | Existing (Reuse)   | `src/frontend/layouts/AppShell.tsx`                 | Root shell containing header, skip-link, and main outlet. Unchanged.                                                                                              |
| **`Header`**                | Existing (Reuse)   | `src/frontend/layouts/Header.tsx`                   | Top application header with responsive picture brand marks and theme switcher. Unchanged.                                                                         |
| **`WorkspaceLayout`**       | Existing (Refine)  | `src/frontend/layouts/WorkspaceLayout.tsx`          | Adapts to provide clean workspace routing context (`SearchProject`) to child Explorer without redundant wrappers.                                                 |
| **`ExplorerLayout`**        | **New** (Phase 6C) | `src/frontend/features/explorer/ExplorerLayout.tsx` | 3-region responsive container managing sidebar disclosure, reader column, and outline TOC layout.                                                                 |
| **`DocTree`**               | **New** (Phase 6C) | `src/frontend/features/explorer/DocTree.tsx`        | Hierarchical document tree renderer with folder collapse/expand, keyboard roving focus, active node waypoint bar, and source section headers.                     |
| **`DocTreeNode`**           | **New** (Phase 6C) | `src/frontend/features/explorer/DocTreeNode.tsx`    | Individual tree item row primitive (directory vs document), indentation levels, active state, and semantic icon.                                                  |
| **`DocReader`**             | **New** (Phase 6C) | `src/frontend/features/explorer/DocReader.tsx`      | Reading plane presenting breadcrumbs, copy path/document action, title header, server-rendered safe Markdown HTML, link diagnostics, and prev/next links.         |
| **`DocOutline` / `DocToc`** | **New** (Phase 6C) | `src/frontend/features/explorer/DocOutline.tsx`     | Right-side sticky table of contents with active heading intersection observer, smooth jump navigation, and collapsible section items.                             |
| **`DocCallout`**            | **New** (Phase 6C) | `src/frontend/components/ui/DocCallout.tsx`         | Reusable architectural directive / callout box primitive with 3px yellow waypoint bar and semantic tone.                                                          |
| **`DocPager`**              | **New** (Phase 6C) | `src/frontend/features/explorer/DocPager.tsx`       | 2-column Previous / Next document navigation card grid at reader footer.                                                                                          |
| **`Icon` & `registry`**     | Existing (Extend)  | `src/frontend/icons/registry.ts`                    | Add semantic keys for Explorer: `folder`, `folderOpen`, `file`, `chevronRight`, `chevronDown`, `copy`, `history`, `refresh`, `arrowLeft`, `arrowRight`, `search`. |
| **`ShowcasePage`**          | Existing (Extend)  | `src/frontend/features/design-system/`              | Add `/app/design-system` Explorer specimen section with honest, fixture-only preview data.                                                                        |

---

## 5. API & Behavioral Contract Map

All frontend data requests map directly to existing, tested Kairn core HTTP endpoints without inventing parallel routes or importing Node modules into the browser bundle:

| Feature Need                  | Backend HTTP Endpoint                                                | Request Method | Response Payload Contract                                                                   | Client Adapter Status                                                                                 |
| :---------------------------- | :------------------------------------------------------------------- | :------------- | :------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------- |
| **Project Workspace Context** | `/api/context`                                                       | `GET`          | `SearchProject` (`{ id, name }`)                                                            | Implemented in `api/client.ts` (`getContext`).                                                        |
| **Registered Projects List**  | `/api/projects`                                                      | `GET`          | `{ projects: SearchProject[] }`                                                             | Implemented in `api/client.ts` (`getProjects`).                                                       |
| **Project Document Tree**     | `/api/projects/:projectId/tree` or `/api/tree` (startup project)     | `GET`          | `{ tree: NavigationEntry[], warning?: string }`                                             | **To extend in `ApiClient`** (`getTree(projectId?)`). Backend already supports.                       |
| **Active Document Content**   | `/api/projects/:projectId/documents/:id` or `/api/documents/:id`     | `GET`          | `DocumentResponse` (`{ id, path, title, markdown, revision, html, headings, diagnostics }`) | **To extend in `ApiClient`** (`getDocument(id, projectId?)`). Backend already supports with ETag 304. |
| **Document Link Resolution**  | `/api/projects/:projectId/links/:id/:href` or `/api/links/:id/:href` | `GET`          | `LinkResolution` (`{ kind, target, documentId?, fragment?, external? }`)                    | **To extend in `ApiClient`** (`resolveLink(id, href, projectId?)`). Backend already supports.         |
| **Full-Text Project Search**  | `/api/search?q=:query&project=:id`                                   | `GET`          | `SearchResponse` (`{ query, results, total, truncated }`)                                   | Handled via existing `SearchPaletteController` in `src/core/search-palette.ts`.                       |

### 5.1 Content Security & Safety Invariants

- **HTML Generation**: Strictly backend-rendered via `options.viewer.renderMarkdown(markdown)` in `src/server/http.ts`. Raw HTML is escaped; dangerous schemes (`javascript:`, `data:`, `file:`) are sanitized; images are converted to safe text placeholders; script execution is prohibited.
- **CSP**: `default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`.
- **Loopback Enforcement**: IPv4 loopback only; requests validate exact Host/Origin/Sec-Fetch metadata headers.

---

## 6. Acceptance Screenshot Checklist & Viewport Matrix

For Phase 6C-1 visual verification, automated Playwright visual baselines will be produced under reproducible conditions:

| Viewport          | Mode / Theme                                          | Target Baseline Specimen                      | Verification Criteria                                                                                                                                                                                                                   |
| :---------------- | :---------------------------------------------------- | :-------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1280 × 800 px** | Mineral Light (`theme-light`, `accent-mineral`)       | Explorer Shell with Marketing Backend Fixture | 3-region layout alignment: Header 54px, Sidebar 268px, Reader 820px max-width, Outline 190px. Active document waypoint bar (3px yellow), title typography, callout directive, and Prev/Next footer cards match canonical Stitch layout. |
| **1280 × 800 px** | Mineral Dark (`theme-dark`, `accent-mineral`)         | Explorer Shell with Marketing Backend Fixture | Dark-theme contrast and tone: graphite background, dark code block surface, light-dark SVG logo swap, accent yellow readability.                                                                                                        |
| **1280 × 800 px** | Instrument Blue Accent (`theme-light`, `accent-blue`) | Explorer Shell with Marketing Backend Fixture | Accent palette propagation: waypoint indicators, active links, and focus rings adopt Instrument Blue tokens without breaking layout geometry.                                                                                           |
| **375 × 667 px**  | Mineral Light Mobile Viewport                         | Explorer Shell Mobile Reflow                  | Single-column reflow: Outline hidden, Sidebar collapsed into accessible disclosure button, compact header brand mark, reading column padding 16px.                                                                                      |

---

## 7. Conflicts, Missing References & Deferred Features

### 7.1 Resolved Conflicts

1. **Utility-Class Hex Colors vs Mineral Tokens**: Stitch HTML references contain inline Tailwind utility classes with raw hex values (`bg-[#20282E]`, `text-[#E4D13A]`, `bg-[#F4F6F7]`). The canonical choice is strict mapping to Kairn Mineral CSS semantic tokens (`var(--kairn-surface)`, `var(--kairn-text)`, `var(--kairn-accent)`, `var(--kairn-canvas)`). Feature TSX never references hardcoded hex strings.
2. **Duplicate Code Font in Stitch**: One sample used `Courier Prime` while canonical Stitch specifications and `designs/design.md` mandate `IBM Plex Mono`. Kairn exclusively bundles and uses `IBM Plex Mono` for code and monospace roles.
3. **Sidebar Tree Widths**: `ui-documentation-explorer.html` uses `268px` (`w-[268px]`), while `ui-documentation-explorer-marketing-backend-sample.html` uses `w-64` (`256px`). We standardize on `--kairn-sidebar-width: 16.75rem` (`268px`) on desktop to comfortably accommodate deeply nested documentation hierarchies without aggressive truncation.

### 7.2 Missing References & Accessibility Fallbacks

- **Mobile Disclosure Drawer**: Stitch mockups only provide desktop 1280px views. We ground mobile reflow in Kairn's existing tested `Sidebar` disclosure pattern (native `<button aria-expanded="...">` + `<nav hidden="...">`), ensuring full keyboard and screen reader accessibility at narrow viewports without guessing complex floating drawer gestures.

### 7.3 Explicitly Deferred Features (Non-6C Scope)

- **Markdown Editing ("Edit MD")**: Kairn is a local-first read-only documentation explorer and Git history viewer. Document mutation is explicitly deferred to later phases.
- **Git Commit Diff Timeline ("14 Commits" / "View Diff")**: Git history browsing and visual diffs belong to Phase 7 (`ui-git-history-explorer.html`).
- **Live Sync Engine ("Sync with origin" / "Force Sync")**: Kairn's core uses local loopback filesystem scanning with coalesced auto-refresh; remote Git push/fetch operations belong to external user workflows.
