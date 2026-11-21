# Kairn Mineral design system

Status: Phase 6B normalized design contract; implementation verified by staged tests.
Canonical visual ownership: primitives → semantics → component styles → composition.
No Explorer, settings persistence, Git or new search behavior in this milestone.

## References and conflict resolution

Reviewed local references: designs/design.md, ui-documentation-explorer.png,
global-settings-appearance.png, project-settings-general.png and kairn-logo.svg.
These remain user-owned untracked source references; no mock project data is copied.
The showcase demonstrates patterns, not pixel-for-pixel finished product screens.

| Reference conflict                                                  | Canonical choice                                    | Reason                                                                |
| ------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------- |
| Neutral canvas #F4F6F7 vs blue generated containers #e1f0ff/#ecf4ff | Neutral canvas and #FFFFFF/#ECEEF0 surfaces         | Explicit Mineral palette and restrained technical direction           |
| IBM Plex Mono vs duplicate Courier Prime code role                  | IBM Plex Mono                                       | Explicit approved typography roles                                    |
| Scale line heights 1.2/1.35 vs duplicate 44px/28px                  | Explicit role sizes and rounded pixel line heights  | Predictable dense rhythm; responsive display reduces at narrow widths |
| 4/6/10/14px geometry vs generic rounded 4/8/12/16/24px              | 4/6/10/14px                                         | Named control/panel/overlay roles take precedence                     |
| #768692 tertiary text                                               | Preserve primitive; darker semantic muted text      | Normal text on light surfaces requires 4.5:1                          |
| #DCE1E5 decorative border vs control boundary                       | Preserve hairline; distinct stronger control border | Interactive outlines require 3:1                                      |
| Yellow foreground on white                                          | Graphite text on yellow; graphite focus/link roles  | Yellow remains wayfinding emphasis, never low-contrast text           |

## Tokens and themes

Primitive values live in tokens.css; themes.css maps semantic roles to Light/Dark
and predefined Mineral, Blue and Forest accents. Keep Phase 6A names as compatibility
contracts. Add surface-hover/selected/subtle, control border, focus, accent-hover/
subtle/ink, status background/foreground, typography, geometry and reading roles.
Tailwind @theme inline consumes semantics; feature TSX never uses primitive colors.

ThemeProvider owns runtime appearance/accent state and restores prior root attributes
on cleanup. CSS light-dark() and color-scheme media queries follow live system
changes; explicit Light/Dark overrides system. initialAppearance/initialAccent are
the future validated-preferences injection interface, not browser persistence.
No localStorage, mutation APIs or arbitrary hex accent input. Every accent supplies
fill/hover/subtle/on-accent/ink values for both appearances. Status colors stay fixed.

## Typography, geometry and fonts

Syne display, Plus Jakarta Sans UI/body and IBM Plex Mono technical roles. Bundle
only Latin WOFF2 assets needed for normal weights; preserve upstream OFL notices.
Fallbacks cover unsupported scripts. No remote requests. Role classes define family,
weight, size, line-height and tracking centrally, including technical-label.
4px spacing scale; 32/40/44px controls, 4/6/10/14px radii, fine decorative borders,
stronger control outlines, restrained shadows. Navigation uses a 3px wayfinding bar.
Responsive layouts wrap at 48rem and reflow at 320 CSS px. Motion uses one token,
zero under reduced-motion; no animation framework.

## Component conventions

Native props/ref and class extension where useful. Button retains existing variants
and sizes. IconButton requires a label. TextInput/Select own label, description/error
IDs and invalid state; controlled/uncontrolled values use native React contracts.
Switch is a native checkbox with role=switch and label, preserving Space/form/reset.
Badge, Card, Divider, SectionHeading, SettingRow and SettingsSection are semantic
composition. SidebarItem owns active/focus/icon alignment. Tabs use manual keyboard
activation with roving focus, arrows/Home/End and associated panels. Breadcrumbs
use ordered navigation and aria-current; no false functional product data.

Sidebar remains hide/reveal disclosure; this is not an icon rail. All workspace and
settings layouts reuse the same primitive. Header remains one component and shows
only implemented links. Custom wayfinding icon is an original non-brand glyph;
approved logo integration stays distinct from semantic icons.

## Prose and showcase

`/app/design-system` is lazy-loaded and clearly labeled internal component preview.
Its controls use the real ThemeProvider. Static `.kairn-prose` markup demonstrates
headings/lists/tables/code/quotes/links/callouts/captions without a second renderer,
images, raw HTML injection or syntax highlighting. All reading rules are scoped.

## Extension and verification

Add components in components/ui with native semantics, token CSS and focused tests;
then adopt them in features and extend lint restrictions. Add custom SVGs using
SvgIconComponent, forwarding root props, viewBox/currentColor and Icon-owned labels.
Add accents only as complete paired semantic values with contrast/browser tests.
No page-specific layout overrides or primitive bypass. Components never import app
state; theme controls are feature composition over shared primitives.

Tests cover control state, keyboard interactions, refs/errors, theme cleanup,
contrast and all appearance/accent combinations, live system switching, reduced
motion, reflow and installed local-only font/assets. Stable screenshot baselines
use bundled fonts on a single pinned browser/OS family, not cross-platform pixel
comparisons. Behavioral tests remain cross-platform. Measurements and actual
verification are recorded below once run.

## Font provenance

Selected Latin WOFF2 sources: Fontsource 5.3.0 packages for Syne variable 400–800,
Plus Jakarta Sans variable 200–800 and IBM Plex Mono normal 400. The matching OFL
notices are preserved beside source fonts and copied into packaged assets by the
build. [Fontsource Jakarta license](https://fontsource.org/fonts/plus-jakarta-sans/about)
and [IBM Plex source](https://github.com/IBM/plex) document the upstream licensing.
Only three fonts ship; no italic or additional script subsets. Fallback fonts cover
other scripts. The asset loader permits fonts under the same file/count/byte caps;
CSP permits only same-origin fonts. Notices are packaged, not served as routes.
