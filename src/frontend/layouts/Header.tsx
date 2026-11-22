import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import markLight from "../assets/brand/kairn-mark-light.svg?no-inline";
import markDark from "../assets/brand/kairn-mark-dark.svg?no-inline";
import wordmarkLight from "../assets/brand/kairn-wordmark-light.svg?no-inline";
import wordmarkDark from "../assets/brand/kairn-wordmark-dark.svg?no-inline";
import { useTheme } from "../app/providers/ThemeProvider";
import { useApplication } from "../app/providers/ApplicationProvider";
import { useSearch } from "../features/search/SearchContext";
import { SearchTrigger } from "../features/search/SearchTrigger";
import { Icon } from "../icons/Icon";
import { Button } from "../components/ui/Button";

function useSafeApplication() {
  try {
    return useApplication();
  } catch {
    return null;
  }
}

/** Application-wide header aligned with canonical Stitch Documentation Explorer. */
export function Header() {
  const { appearance, setAppearance } = useTheme();
  const { openSearch } = useSearch();
  const app = useSafeApplication();
  const location = useLocation();
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);

  const [systemDark, setSystemDark] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const isDark =
    appearance === "dark" || (appearance === "system" && systemDark);

  // Derive active project identity
  const projectMatch = location.pathname.match(/^\/projects\/([^/]+)/);
  const routeProjectId = projectMatch ? projectMatch[1] : undefined;
  const isShowcaseExplorer = location.pathname.includes(
    "/design-system/explorer",
  );

  const activeProject = app
    ? (app.projects.find((p) => p.id === routeProjectId) ??
      (app.current.id === routeProjectId ? app.current : null))
    : null;

  const activeProjectName = isShowcaseExplorer
    ? "Marketing Backend"
    : (activeProject?.name ?? app?.current?.name ?? "Marketing Backend");

  const hasMultipleProjects = Boolean(app && app.projects.length > 1);

  const settingsPath = routeProjectId
    ? `/projects/${routeProjectId}/settings/general`
    : "/settings/appearance";

  const toggleTheme = () => {
    setAppearance(isDark ? "light" : "dark");
  };

  return (
    <header className="app-header">
      {/* 1. Left Region: Brand + Divider + Project Identity */}
      <div className="app-header-left">
        <Link to="/" aria-label="Kairn home" className="app-brand">
          <picture key={isDark ? "dark" : "light"}>
            <source
              media="(max-width: 48rem)"
              srcSet={isDark ? markDark : markLight}
            />
            <img src={isDark ? wordmarkDark : wordmarkLight} alt="Kairn" />
          </picture>
        </Link>

        <div className="app-header-divider" aria-hidden="true" />

        <div className="app-header-project">
          <Button
            variant="ghost"
            type="button"
            className="app-header-project-btn"
            aria-label={`Current project: ${activeProjectName}`}
            aria-expanded={
              hasMultipleProjects ? projectDropdownOpen : undefined
            }
            onClick={() => {
              if (hasMultipleProjects) setProjectDropdownOpen((v) => !v);
            }}
          >
            <span className="app-header-project-dot" aria-hidden="true" />
            <span className="app-header-project-name">{activeProjectName}</span>
            <span className="app-header-branch-badge">
              <Icon name="gitBranch" className="icon-xs" />
              <span>git:main</span>
            </span>
            {hasMultipleProjects && (
              <Icon
                name={projectDropdownOpen ? "chevronDown" : "chevronRight"}
                className="icon-xs app-header-project-chevron"
              />
            )}
          </Button>

          {projectDropdownOpen && hasMultipleProjects && (
            <ul className="app-header-project-menu" role="menu">
              {app!.projects.map((p) => (
                <li key={p.id} role="none">
                  <Link
                    to={`/projects/${p.id}/docs`}
                    role="menuitem"
                    className="app-header-project-menu-item"
                    onClick={() => setProjectDropdownOpen(false)}
                  >
                    <span
                      className="app-header-project-dot"
                      aria-hidden="true"
                    />
                    <span>{p.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 2. Center Region: Centered Search Input Trigger Pill */}
      <div className="app-header-search">
        <SearchTrigger onClick={() => openSearch()} />
      </div>

      {/* 3. Right Region: Theme Toggle + Settings Icon Button */}
      <div className="app-header-actions">
        <Button
          variant="ghost"
          data-size="sm"
          className="app-header-icon-btn"
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
          title={isDark ? "Switch to light theme" : "Switch to dark theme"}
        >
          <Icon name={isDark ? "sun" : "moon"} className="icon-sm" />
        </Button>
        <Link
          to={settingsPath}
          className="ui-button ui-button-ghost app-header-icon-btn"
          data-size="sm"
          aria-label="Documentation settings"
          title="Documentation settings"
        >
          <Icon name="settings" className="icon-sm" />
        </Link>
      </div>
    </header>
  );
}
