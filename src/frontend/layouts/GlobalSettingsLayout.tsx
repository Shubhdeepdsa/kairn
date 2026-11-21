import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
/** Structural settings demonstration, not settings persistence or forms. */
export function GlobalSettingsLayout() {
  return (
    <div className="workspace-layout">
      <Sidebar
        label="Global settings navigation"
        items={[
          { to: "/settings/appearance", label: "Appearance contract" },
          { to: "/settings/reading", label: "Reading contract" },
        ]}
      />
      <div className="content-panel">
        <Outlet />
      </div>
    </div>
  );
}
