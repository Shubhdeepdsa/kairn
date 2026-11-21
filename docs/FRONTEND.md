# React frontend foundation

Status: Phase 6A architecture accepted; implementation and verification follow in
staged commits. Phase 6B supplies Mineral styling; Phase 6C supplies reader parity.

## Ownership and migration

Keep one package, npm lockfile, CLI and localhost server. The working vanilla reader
remains at `/`, including legacy fragment bookmarks, search, live refresh and
cross-project history. React lives at `/app` with BrowserRouter basename `/app`.
It is a clearly labeled foundation, not a working replacement reader. Only after
Phase 6C parity and bookmark migration tests may the canonical entry move and the
vanilla implementation retire. Do not maintain two permanent reader engines.

Browser imports flow app/pages → features/layouts → UI/icons/styles and typed API.
Core retains discovery, config, document/link/search and navigation authority.
Frontend may import browser-safe contracts and pure controllers; never Node, CLI,
server implementations or the vanilla DOM adapter. Do not duplicate palette or
Markdown state machines. Node and browser TypeScript builds are separate.

## Build and production boundary

React + Vite, Tailwind v4 Vite integration, declarative React Router, native fetch,
Lucide through a semantic registry, Testing Library/Vitest and Playwright are the
chosen stack. Verify stable manifests against Node 26 before installing.
Production assets go in `dist/frontend/`, within the existing package's `dist`.
Only explicit preloaded JS/CSS assets and the app HTML may be served; never map
browser paths to arbitrary filesystem reads. Limit file count, per-file and total
bytes when loading the packaged presentation. No source maps or CDN resources.
Use no-store while this transitional route/build-watch workflow is supported.

Existing exact Host/Origin/Fetch Metadata, GET/body/URL/concurrency limits, CSP
and loopback binding apply to React too. SPA fallback is limited to `/app` and
its routing namespace; invalid APIs/assets never fall back to HTML. Application
unknown routes show a not-found view. No CORS, proxy or second runtime server.
Development uses Vite build-watch and the existing Kairn server; refresh assets
on restart. This sacrifices HMR to preserve the same production trust boundary.

## Routes and shared structure

One route module owns nested layouts, project/document ID validation and lazy route
views. Minimal demonstrations: foundation overview, project documentation handoff,
global appearance contract and project general-settings contract. They identify
unimplemented screens explicitly. Back/Forward belongs to React Router, not a new
navigation store. Legacy reader URLs remain on `/`; React links to the existing
reader rather than pretending to render documents.

AppShell owns one Header, skip link, theme root and application content region.
WorkspaceLayout validates and resolves approved project context, composing a
shared Sidebar. GlobalSettingsLayout and ProjectSettingsLayout use the same
Sidebar interaction primitive with different items. Sidebar disclosure state is
local, implemented once; active state and keyboard semantics use native links and
buttons. Do not infer project existence from syntactically valid IDs.

## Components, icons and styling

Adopted primitives own reusable appearance/interaction; pages compose them.
Button extends native button props, defaults to type=button, supports documented
variants/sizes, class extension, disabled/loading states and a ref. Loading must
prevent repeated activation without removing its accessible label. Use native
keyboard behavior and visible focus. Inputs added later should explicitly choose
controlled or uncontrolled contracts, associated labels and error descriptions.
Test IDs are exceptions; prefer role/name queries.

Icon uses a small statically imported Lucide registry keyed by semantic names.
Consumers never import Lucide directly. Registry entries can become custom SVG
components without changing callers. Sizes and currentColor consume shared tokens.
Decorative icons are hidden; meaningful icons require a nonempty accessible label.

Token owners: tokens.css defines semantic surfaces/text/border/accent/status,
typography/spacing/radius/shadow/focus/motion; themes.css supplies light/dark/system
and reduced-motion behavior; index.css integrates Tailwind semantic aliases and
base styles. Components use tokens; features use composition, not new color values.
No remote fonts, CSS-in-JS, inline style attributes or full design system yet.
Theme demonstrations are runtime-only; no persistent appearance settings UI.

## Settings contract (future implementation)

Separate documentation config from visual/reading preferences. Existing shared
`.kairn/config.json` and personal source overrides remain core-owned and unchanged.
Built-in defaults → validated machine-global personal preferences → explicitly
supported project overrides → effective values. Only opted-in fields inherit;
never allow universal project overrides. Runtime dialogs, disclosure and unsaved
form drafts are not persistent configuration.

Future core APIs must own typed versioned schemas, defaults, validation, stable
machine-local storage, migrations and effective-value resolution. Future read
responses should include effective values, ownership/provenance and a revision;
notifications invalidate a single owned server-state resource. Save validates and
compares revision before atomic write; conflicts preserve the draft and require
reload/review. Cancel discards the draft. Unsupported migrations preserve bytes.
No settings writes, forms, browser storage authority or generic settings engine in
6A. Mutation security requires a separate design before any endpoint is introduced.

## State and API conventions

Local state for disclosures/theme demonstration; reducers or existing controllers
for complex interactions. Small separate Contexts for theme and shared application
context only. Typed API owns exact same-origin GETs, AbortSignal, validated response
shape and redacted errors; components never construct API URLs. One provider owns
context/projects loading/error/retry and aborts obsolete effects. No duplicated
server caches, giant Context, Redux, Zustand or speculative query library.

## Enforcement and verification

Separate TypeScript programs and ESLint restrictions enforce cross-layer imports,
shared Button/Icon use, React hooks and no feature colors. Architecture tests check
the transitive browser import closure and import cycles, primitive reuse and token
consumption. Component tests cover initialization, loading/errors, routing, shared
sidebar behavior, buttons, icons, theme cleanup and API abort/errors. Playwright
uses a packed installed CLI with isolated docs/data, verifies direct app routes,
Back/Forward, unknown routes, request/console security and the existing reader.
All Phase 1–5 tests remain. Record bundle JS/CSS/gzip/chunks and package growth from
real builds; document browser/CI limitations separately. No npm publication.

## Build scripts (implemented)

`npm run build` compiles Node then builds the static frontend. `npm run typecheck`
checks separate Node/browser programs. `npm run dev:frontend` watches frontend
build output; run the CLI normally and restart/reload after a rebuild. Vite is
build tooling only. React, React DOM, router and Lucide are bundled devDependencies,
so production-only package installation adds no Node runtime resolution of them.
The official [Vite build guide](https://vite.dev/guide/build.html),
[Tailwind Vite integration](https://tailwindcss.com/docs/installation/using-vite)
and [declarative router](https://reactrouter.com/start/declarative/installation)
are the integration references. Node 26.13.0 satisfies the installed manifests.

## Implemented demonstration routes

- `/app`: startup project identity and runtime-only token preview.
- `/app/projects/:projectId/docs[/:documentId]`: workspace structure; valid explicit
  document IDs hand off to the existing reader's scoped fragment URL.
- `/app/settings/appearance` and `/app/settings/reading`: global contract views.
- `/app/projects/:projectId/settings/general` and `/sources`: project contract views.

A workspace without an explicit document links to the startup reader; no invalid
project-only fragment is fabricated. Syntactically invalid and unknown project
identities show errors. Other app paths show Page not found; missing files/APIs
remain HTTP errors. No full Library or settings functionality is claimed.
