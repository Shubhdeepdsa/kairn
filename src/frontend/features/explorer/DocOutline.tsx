import { useState } from "react";
import type { DocumentHeading } from "../../lib/api/types.js";
import { IconButton } from "../../components/ui/IconButton";

export interface DocOutlineProps {
  readonly headings: readonly DocumentHeading[];
  readonly activeFragment?: string | undefined;
  readonly onSelectHeading?: ((fragment: string) => void) | undefined;
}

/**
 * On-page document table of contents outline.
 * Highlights current active heading with the Mineral waypoint dot indicator.
 */
export function DocOutline({
  headings,
  activeFragment,
  onSelectHeading,
}: DocOutlineProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (headings.length === 0) return null;

  return (
    <aside className="doc-outline" aria-label="Table of contents">
      <div className="doc-outline-sticky">
        <div className="doc-outline-header">
          <span className="doc-outline-title">On this page</span>
          <IconButton
            label={collapsed ? "Expand outline" : "Collapse outline"}
            icon={collapsed ? "chevronDown" : "chevronRight"}
            variant="ghost"
            size="sm"
            className="doc-outline-toggle"
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((v) => !v)}
          />
        </div>
        {!collapsed && (
          <nav className="doc-outline-nav">
            <ul className="doc-outline-list">
              {headings.map((heading) => {
                const isActive = activeFragment === heading.fragment;
                const isSubheading = heading.level > 2;

                return (
                  <li
                    key={heading.fragment}
                    className={`doc-outline-item ${
                      isSubheading ? "doc-outline-subitem" : ""
                    }`}
                  >
                    <a
                      href={`#${heading.fragment}`}
                      className={`doc-outline-link ${
                        isActive ? "is-active" : ""
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        onSelectHeading?.(heading.fragment);
                      }}
                    >
                      <span
                        className="doc-outline-dot"
                        aria-hidden="true"
                        data-active={isActive ? "true" : "false"}
                      />
                      <span className="doc-outline-text">{heading.title}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
    </aside>
  );
}
