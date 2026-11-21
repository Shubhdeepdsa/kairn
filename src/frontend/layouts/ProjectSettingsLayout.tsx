import { Outlet } from "react-router";
import { useWorkspace } from "./WorkspaceLayout";
import { Sidebar } from "./Sidebar";
/** Reuses the same navigation disclosure within the workspace; no configuration writes. */
export function ProjectSettingsLayout() {
  const project = useWorkspace();
  return (
    <div className="workspace-layout">
      <Sidebar
        label="Project settings navigation"
        items={[
          {
            to: `/projects/${project.id}/settings/general`,
            label: "General contract",
          },
          {
            to: `/projects/${project.id}/settings/sources`,
            label: "Sources contract",
          },
        ]}
      />
      <div className="content-panel">
        <Outlet context={project} />
      </div>
    </div>
  );
}
