import { lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { AppShell } from "../layouts/AppShell";
import { WorkspaceLayout } from "../layouts/WorkspaceLayout";
import { GlobalSettingsLayout } from "../layouts/GlobalSettingsLayout";
import { ProjectSettingsLayout } from "../layouts/ProjectSettingsLayout";
import { useApplication } from "./providers/ApplicationProvider";
import { parseReaderLocation } from "../../core/reader-location.js";

const Overview = lazy(() =>
  import("../features/foundation/OverviewPage").then((m) => ({
    default: m.OverviewPage,
  })),
);
const Documentation = lazy(() =>
  import("../features/foundation/DocumentationPage").then((m) => ({
    default: m.DocumentationPage,
  })),
);
const Settings = lazy(() =>
  import("../features/foundation/SettingsPage").then((m) => ({
    default: m.SettingsPage,
  })),
);
const Showcase = lazy(() =>
  import("../features/design-system/ShowcasePage").then((m) => ({
    default: m.ShowcasePage,
  })),
);
const ExplorerShowcase = lazy(() =>
  import("../features/design-system/ExplorerShowcasePage").then((m) => ({
    default: m.ExplorerShowcasePage,
  })),
);

/**
 * Redirects the /app entry point to the active project's Documentation Explorer,
 * preserving valid legacy bookmarks (#<id>, #<id>/<heading>, #p/<projectId>/<id>/<heading>).
 */
export function AppIndexRedirect() {
  const { current, projects } = useApplication();
  const location = useLocation();

  if (location.hash) {
    const bookmark = parseReaderLocation(location.hash);
    if (bookmark && bookmark.id !== "invalid") {
      const fragment = bookmark.fragment
        ? `#${encodeURIComponent(bookmark.fragment)}`
        : "";
      if (bookmark.projectId) {
        const target = projects.find((p) => p.id === bookmark.projectId);
        if (target) {
          return (
            <Navigate
              to={`/projects/${target.id}/docs/${bookmark.id}${fragment}`}
              replace
            />
          );
        }
        return (
          <section role="alert">
            <h1>Project unavailable</h1>
            <p>The requested project is unavailable or not registered.</p>
          </section>
        );
      }
      return (
        <Navigate
          to={`/projects/${current.id}/docs/${bookmark.id}${fragment}`}
          replace
        />
      );
    }
    if (bookmark && bookmark.id === "invalid") {
      return (
        <section role="alert">
          <h1>Invalid document</h1>
          <p>Invalid document identifier.</p>
        </section>
      );
    }
  }

  return <Navigate to={`/projects/${current.id}/docs`} replace />;
}

/** Sole route owner; basename is supplied by the browser entry, and tests can supply MemoryRouter. */
export function ApplicationRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<AppIndexRedirect />} />
        <Route path="overview" element={<Overview />} />
        <Route path="design-system" element={<Showcase />} />
        <Route path="design-system/explorer" element={<ExplorerShowcase />} />
        <Route path="projects/:projectId" element={<WorkspaceLayout />}>
          <Route path="docs" element={<Documentation />} />
          <Route path="docs/:documentId" element={<Documentation />} />
          <Route path="settings" element={<ProjectSettingsLayout />}>
            <Route path="general" element={<Settings />} />
            <Route path="sources" element={<Settings />} />
          </Route>
        </Route>
        <Route path="settings" element={<GlobalSettingsLayout />}>
          <Route path="appearance" element={<Settings />} />
          <Route path="reading" element={<Settings />} />
        </Route>
        <Route
          path="*"
          element={
            <section>
              <h1>Page not found</h1>
              <p>This route does not exist.</p>
            </section>
          }
        />
      </Route>
    </Routes>
  );
}
