import { useState } from "react";
import type { ReactNode } from "react";
import { Link, useInRouterContext } from "react-router";
import { Icon } from "../../icons/Icon";
import { Button } from "../../components/ui/Button";

function SafeLink({
  to,
  className,
  children,
  ...rest
}: {
  to: string;
  className?: string;
  children: ReactNode;
  [key: string]: unknown;
}) {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return (
      <Link to={to} className={className} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a href={to} className={className} {...rest}>
      {children}
    </a>
  );
}

export interface ExplorerShellProps {
  readonly projectName: string;
  readonly projectId?: string | undefined;
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
  projectId,
  navigation,
  children,
  outline,
}: ExplorerShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const docsPath = projectId ? `/projects/${projectId}/docs` : "#";
  const settingsPath = projectId
    ? `/projects/${projectId}/settings/general`
    : "/settings/general";

  return (
    <div className="explorer-shell">
      {/* Mobile drawer toggle bar */}
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
            {/* Project identity badge */}
            <div className="explorer-project-badge">
              <span className="explorer-project-dot" aria-hidden="true" />
              <span className="explorer-project-name">{projectName}</span>
            </div>

            {/* Workspace-level Navigation (Stitch Reference) */}
            <nav
              className="explorer-workspace-nav"
              aria-label="Workspace navigation"
            >
              <SafeLink
                to={docsPath}
                className="explorer-nav-item is-active"
                aria-current="page"
              >
                <div className="explorer-nav-item-leading">
                  <Icon
                    name="documentation"
                    className="icon-sm explorer-nav-icon"
                  />
                  <span>Documentation</span>
                </div>
                <span className="explorer-nav-dot" aria-hidden="true" />
              </SafeLink>

              <div
                className="explorer-nav-item is-disabled"
                aria-disabled="true"
                title="Git History (Planned for Phase 7)"
              >
                <div className="explorer-nav-item-leading">
                  <Icon name="gitCommit" className="icon-sm" />
                  <span>Git History</span>
                </div>
                <span className="explorer-nav-badge">Deferred</span>
              </div>

              <SafeLink to={settingsPath} className="explorer-nav-item">
                <div className="explorer-nav-item-leading">
                  <Icon name="settings" className="icon-sm" />
                  <span>Project Settings</span>
                </div>
              </SafeLink>
            </nav>

            <div className="explorer-sidebar-divider" aria-hidden="true" />

            {/* Hierarchical Document Navigation Tree */}
            <div className="explorer-tree-container">{navigation}</div>
          </div>

          {/* Sidebar Footer: Truthful local sync indicator */}
          <div className="explorer-sidebar-footer">
            <div className="explorer-sync-status">
              <span className="explorer-sync-dot" aria-hidden="true" />
              <span>Synced · Local ready</span>
            </div>
          </div>
        </aside>

        {/* Region 2: Central Document Reading Plane (single main owned by AppShell) */}
        <div className="explorer-main">{children}</div>

        {/* Region 3: Right On-Page Outline TOC */}
        {outline && <div className="explorer-outline-pane">{outline}</div>}
      </div>
    </div>
  );
}
