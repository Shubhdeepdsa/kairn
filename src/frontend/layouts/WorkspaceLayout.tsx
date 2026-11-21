import { Outlet, useLocation, useOutletContext, useParams } from "react-router";
import { isProjectId } from "../../core/search-contracts.js";
import type { SearchProject } from "../../core/search-contracts.js";
import { useApplication } from "../app/providers/ApplicationProvider";
import { Sidebar } from "./Sidebar";

/** Validates route identity against the startup-approved context; never discovers project paths. */
export function WorkspaceLayout() {
  const { projectId } = useParams();
  const location = useLocation();
  const app = useApplication();
  if (!projectId || !isProjectId(projectId))
    return <p role="alert">Invalid project identifier.</p>;
  const project =
    app.current.id === projectId
      ? app.current
      : app.projects.find((p) => p.id === projectId);
  if (!project)
    return (
      <p role="alert">
        Project is unavailable. Reopen the foundation to refresh the Library.
      </p>
    );

  // Documentation Explorer manages its own 3-region responsive layout.
  // Bypass redundant outer sidebar wrappers when viewing docs.
  if (location.pathname.includes("/docs")) {
    return <Outlet context={project} />;
  }

  const base = `/projects/${project.id}`;
  return (
    <section aria-label="Workspace">
      <h1>{project.name}</h1>
      <div className="workspace-layout">
        <Sidebar
          label="Workspace navigation"
          items={[
            { to: base + "/docs", label: "Documentation" },
            { to: base + "/settings/general", label: "Project settings" },
          ]}
        />
        <div className="content-panel">
          <Outlet context={project} />
        </div>
      </div>
    </section>
  );
}

export function useWorkspace(): SearchProject {
  return useOutletContext<SearchProject>();
}
