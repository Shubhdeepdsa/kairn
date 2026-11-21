import { useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "../../icons/Icon";
import { Button } from "../../components/ui/Button";

export interface ExplorerShellProps {
  readonly projectName: string;
  readonly navigation: ReactNode;
  readonly children: ReactNode;
  readonly outline?: ReactNode | undefined;
}

/**
 * 3-Region responsive Documentation Explorer layout shell.
 * Coordinates Left Navigation (268px), Central Reader (820px max), and Right Outline (190px).
 */
export function ExplorerShell({
  projectName,
  navigation,
  children,
  outline,
}: ExplorerShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="explorer-shell">
      {/* Mobile drawer toggle */}
      <div className="explorer-mobile-bar">
        <Button
          variant="ghost"
          data-size="sm"
          aria-expanded={sidebarOpen}
          aria-controls="explorer-sidebar"
          onClick={() => setSidebarOpen((v) => !v)}
        >
          <Icon name="sidebar" className="icon-sm" />
          <span>{sidebarOpen ? "Close navigation" : "Open navigation"}</span>
        </Button>
        <span className="explorer-mobile-project">{projectName}</span>
      </div>

      <div className="explorer-body">
        {/* Region 1: Left Navigation Sidebar */}
        <aside
          id="explorer-sidebar"
          className={`explorer-sidebar ${sidebarOpen ? "is-open" : ""}`}
          aria-label="Documentation navigation"
        >
          <div className="explorer-sidebar-content">
            <div className="explorer-project-badge">
              <span className="explorer-project-dot" aria-hidden="true" />
              <span className="explorer-project-name">{projectName}</span>
            </div>
            {navigation}
          </div>
          <div className="explorer-sidebar-footer">
            <div className="explorer-sync-status">
              <span className="explorer-sync-dot" aria-hidden="true" />
              <span>Synced · Local ready</span>
            </div>
          </div>
        </aside>

        {/* Region 2: Central Document Reading Plane */}
        <main className="explorer-main">{children}</main>

        {/* Region 3: Right On-Page Outline TOC */}
        {outline && <div className="explorer-outline-pane">{outline}</div>}
      </div>
    </div>
  );
}
