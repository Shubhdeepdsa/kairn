# Kairn Design Artifacts & Screen Catalog

> **Source Project:** [Google Stitch Project 8112911233485003001](https://stitch.google.com/projects/8112911233485003001?pli=1)  
> **Design Specification:** [`design.md`](./design.md) (Kairn — Mineral Precision)  
> **Design Token Spec:** YAML tokens & visual signature rules in [`design.md`](./design.md)  
> **Full Archive:** Stored in persistent release assets: `kairn-designs-full-archive.zip` (24 MB, 38 screens + logo experiments)

---

## Directory Architecture

```text
designs/
├── design.md              # Authoritative Mineral Precision token specification
├── README.md              # Design catalog and artifact index (this document)
├── logos/
│   └── approved/          # Final approved vector SVG and raster PNG brand marks
├── reference-code/        # 26 Stitch HTML layouts + 6 Stitch brand SVGs (self-contained)
└── screenshots/           # 6 canonical high-resolution screenshots for core views
```

To keep repository clones lightweight and avoid bloated Git history, this directory contains canonical mockups and code references. The complete 38-screen full-resolution capture suite and historical logo experiments are archived in release storage.

---

## Canonical Application Screenshots

The `screenshots/` directory holds canonical screenshots representing Kairn's primary user experiences:

| Screenshot                                                               | Description                                                                                            | Corresponding Reference Code                                                                        |
| :----------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------- |
| [`documentation-explorer.png`](./screenshots/documentation-explorer.png) | Three-pane documentation reader with hierarchy sidebar, markdown view, and active table of contents    | [`ui-documentation-explorer.html`](./reference-code/ui-documentation-explorer.html)                 |
| [`library.png`](./screenshots/library.png)                               | Workspace library overview displaying registered documentation repositories, collections, and statuses | [`ui-library-and-projects-workspace.html`](./reference-code/ui-library-and-projects-workspace.html) |
| [`global-settings.png`](./screenshots/global-settings.png)               | System-wide configuration modal (appearance, typography, reading theme, and CLI defaults)              | [`global-settings-appearance.html`](./reference-code/global-settings-appearance.html)               |
| [`project-settings.png`](./screenshots/project-settings.png)             | Per-project settings (documentation roots, source priorities, and navigation rules)                    | [`project-settings-general.html`](./reference-code/project-settings-general.html)                   |
| [`git-history-explorer.png`](./screenshots/git-history-explorer.png)     | Read-only Git history explorer with revision diff viewer and timeline markers                          | [`ui-git-history-explorer.html`](./reference-code/ui-git-history-explorer.html)                     |
| [`add-project.png`](./screenshots/add-project.png)                       | Discovery and initialization flow for local Markdown documentation sources                             | [`ui-add-project-discovery.html`](./reference-code/ui-add-project-discovery.html)                   |

---

## Approved Brand Marks

Approved vector and raster brand marks are located in [`logos/approved/`](./logos/approved/):

| Asset                        | Formats                                                                                                                                                           | Purpose                                                                                  |
| :--------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------- |
| **Cairn Mark**               | [`cairn-mark.svg`](./logos/approved/cairn-mark.svg) / [`cairn-mark.png`](./logos/approved/cairn-mark.png)                                                         | Primary visual identifier (stacked mineral wayfinding stones with active node indicator) |
| **Horizontal System Lockup** | [`horizontal-system-lockup.svg`](./logos/approved/horizontal-system-lockup.svg) / [`horizontal-system-lockup.png`](./logos/approved/horizontal-system-lockup.png) | Header and hero lockup combining the Cairn Mark with Syne wordmark                       |
| **App Icon**                 | [`app-icon.svg`](./logos/approved/app-icon.svg) / [`app-icon.png`](./logos/approved/app-icon.png)                                                                 | Desktop application and browser favicon asset with mineral rounded squircle container    |

---

## Reference Code Catalog

All files in [`reference-code/`](./reference-code/) are standalone, self-contained reference implementations exported directly from Google Stitch. They use Tailwind CSS (via CDN) and Google Web Fonts (`Syne`, `Plus Jakarta Sans`, `IBM Plex Mono`), with all icons as inline SVGs or Material Symbols. They can be opened and previewed directly in any web browser without local build dependencies.

### Core UI Views (HTML)

- [`ui-documentation-explorer.html`](./reference-code/ui-documentation-explorer.html) — Canonical documentation reading interface
- [`ui-documentation-explorer-marketing-backend-sample.html`](./reference-code/ui-documentation-explorer-marketing-backend-sample.html) — Rich documentation sample with multi-tab code specimens
- [`ui-documentation-explorer-v1-archive.html`](./reference-code/ui-documentation-explorer-v1-archive.html) — Early documentation reader baseline
- [`ui-library-and-projects-workspace.html`](./reference-code/ui-library-and-projects-workspace.html) — Library workspace with project cards
- [`ui-git-history-explorer.html`](./reference-code/ui-git-history-explorer.html) — Git commit log with split visual diffs
- [`ui-add-project-discovery.html`](./reference-code/ui-add-project-discovery.html) — Add project dialog and directory picker

### Global Settings Views (HTML)

- [`global-settings-appearance.html`](./reference-code/global-settings-appearance.html) — Theme and appearance configuration
- [`global-settings-reading.html`](./reference-code/global-settings-reading.html) — Typography scales, line-height, and reading preferences
- [`global-settings-application-cli.html`](./reference-code/global-settings-application-cli.html) — CLI and daemon connection parameters
- [`global-settings-application-cli-v1-archive.html`](./reference-code/global-settings-application-cli-v1-archive.html) — CLI settings initial revision
- [`global-settings-git-defaults.html`](./reference-code/global-settings-git-defaults.html) — Default Git branch and diff display preferences
- [`global-settings-library-workspace.html`](./reference-code/global-settings-library-workspace.html) — Default documentation discovery roots
- [`global-settings-search.html`](./reference-code/global-settings-search.html) — Indexing and search coordinator preferences
- [`global-settings-search-v1-archive.html`](./reference-code/global-settings-search-v1-archive.html) — Search settings initial revision
- [`global-settings-privacy-data.html`](./reference-code/global-settings-privacy-data.html) — Local telemetry and cache storage rules
- [`global-settings-about-diagnostics.html`](./reference-code/global-settings-about-diagnostics.html) — Version info, environment diagnostics, and health checks

### Project Settings Views (HTML)

- [`project-settings-general.html`](./reference-code/project-settings-general.html) — Project name, description, and primary root
- [`project-settings-navigation.html`](./reference-code/project-settings-navigation.html) — Table-of-contents ordering and hierarchy rules
- [`project-settings-sources.html`](./reference-code/project-settings-sources.html) — Multiple documentation path attachments
- [`project-settings-visibility-ignore-rules.html`](./reference-code/project-settings-visibility-ignore-rules.html) — Path exclusions and hidden document rules
- [`project-settings-git.html`](./reference-code/project-settings-git.html) — Project-level repository binding
- [`project-settings-advanced.html`](./reference-code/project-settings-advanced.html) — Custom markdown extensions and parser overrides

### Brand & Specimen Showcases (HTML & SVG)

- [`specimen-brand-asset-kit-showcase.html`](./reference-code/specimen-brand-asset-kit-showcase.html) — Complete brand asset kit and design token specimen
- [`specimen-logo-identity-four-directions.html`](./reference-code/specimen-logo-identity-four-directions.html) — Exploration matrix comparing identity directions
- [`specimen-mineral-precision-style-guide.html`](./reference-code/specimen-mineral-precision-style-guide.html) — Interactive design system style guide
- [`marketing-launch-specimen.html`](./reference-code/marketing-launch-specimen.html) — Release marketing specimen
- [`brand-cairn-mark.svg`](./reference-code/brand-cairn-mark.svg) / [`brand-cairn-mark-v1-archive.svg`](./reference-code/brand-cairn-mark-v1-archive.svg) — Vector cairn marks
- [`brand-horizontal-system-lockup.svg`](./reference-code/brand-horizontal-system-lockup.svg) / [`brand-horizontal-system-lockup-v1-archive.svg`](./reference-code/brand-horizontal-system-lockup-v1-archive.svg) — Vector horizontal lockups
- [`brand-app-icon.svg`](./reference-code/brand-app-icon.svg) / [`brand-app-icon-v1-archive.svg`](./reference-code/brand-app-icon-v1-archive.svg) — Vector app icons

---

## Full Release Archive

The complete 38-screen image set and historical logo iterations are preserved in the persistent archive package:

- **Archive File:** `kairn-designs-full-archive.zip` (22.97 MB)
- **Persistent Location:** Uploaded to GitHub Release assets upon release tagging.
- **Local Cache:** Stored in `.designs-archive/` (git-ignored) during local development.

### Archive Contents

1. **`all-38-screens/`**: Complete set of 38 full-resolution PNG screens covering all UI screens, settings modals, marketing banners, and specimen sheets.
2. **`historical-logo-experiments/`**: All initial logo iterations, alternative four-direction explorations, and preliminary SVG/PNG assets.
