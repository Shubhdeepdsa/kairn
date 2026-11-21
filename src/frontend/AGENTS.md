# Frontend engineering instructions

Inherits root instructions. This is the browser-only React boundary.

- Import browser-safe contracts and existing pure controllers only; no core Node,
  server, CLI or vanilla DOM implementation imports.
- Pages compose shared layouts, Button and Icon; provider-specific icons stay in
  the registry. UI primitives cannot import features or application state.
- Semantic CSS tokens own visual values. No page-level colors or layout overrides.
- Keep the reader at `/` functional until Phase 6C parity is independently verified.
- Native fetch belongs in lib/api; effects abort on cleanup. Preferences in this
  phase are runtime only, never authoritative localStorage or new write endpoints.
- Tests use disposable fixtures and real packaged assets for browser acceptance.
