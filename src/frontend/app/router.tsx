import { lazy } from "react";
import { Route, Routes } from "react-router";
import { AppShell } from "../layouts/AppShell";
import { WorkspaceLayout } from "../layouts/WorkspaceLayout";
import { GlobalSettingsLayout } from "../layouts/GlobalSettingsLayout";
import { ProjectSettingsLayout } from "../layouts/ProjectSettingsLayout";
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
/** Sole route owner; basename is supplied by the browser entry, and tests can supply MemoryRouter. */
export function ApplicationRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Overview />} />
        <Route path="design-system" element={<Showcase />} />
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
              <p>This foundation route does not exist.</p>
            </section>
          }
        />
      </Route>
    </Routes>
  );
}
