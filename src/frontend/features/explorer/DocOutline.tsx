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
        {!collapsed &&
          (headings.length > 0 ? (
            <nav className="doc-outline-nav">
              <ul className="doc-outline-list">
                {headings.map((heading) => {
                  const isActive = activeFragment === heading.fragment;
                  const isSubheading = heading.level > 2;

                  return (
                    <li
                      key={heading.fragment}
                      className={`doc-outline-item level-${heading.level} ${
                        isSubheading ? "doc-outline-subitem" : ""
                      }`}
                    >
                      <a
                        href={`#${encodeURIComponent(heading.fragment)}`}
                        className={`doc-outline-link ${
                          isActive ? "is-active" : ""
                        }`}
                        aria-current={isActive ? "location" : undefined}
                        onClick={(e) => {
                          if (
                            e.button !== 0 ||
                            e.ctrlKey ||
                            e.metaKey ||
                            e.shiftKey ||
                            e.altKey
                          ) {
                            return;
                          }
                          e.preventDefault();
                          onSelectHeading?.(heading.fragment);
                        }}
                      >
                        <span
                          className="doc-outline-dot"
                          aria-hidden="true"
                          data-active={isActive ? "true" : "false"}
                        />
                        <span className="doc-outline-text">
                          {heading.title}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ) : (
            <div className="doc-outline-empty">
              <span>No headings on this page</span>
            </div>
          ))}
      </div>
    </aside>
  );
}
