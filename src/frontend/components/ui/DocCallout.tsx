import type { ReactNode } from "react";
import { Icon } from "../../icons/Icon";
import type { IconName } from "../../icons/registry";

export interface DocCalloutProps {
  readonly title?: string | undefined;
  readonly icon?: IconName | undefined;
  readonly children: ReactNode;
  readonly className?: string | undefined;
  readonly role?: string | undefined;
}

/**
 * Architectural directive / callout box adhering to Mineral Precision design.
 * Features a 3px vertical accent wayfinding indicator on the leading edge.
 */
export function DocCallout({
  title,
  icon = "wayfinding",
  children,
  className = "",
  role = "note",
}: DocCalloutProps) {
  return (
    <aside className={`ui-doc-callout ${className}`} role={role}>
      {title && (
        <div className="ui-doc-callout-header">
          <Icon name={icon} className="icon-sm" />
          <span>{title}</span>
        </div>
      )}
      <div className="ui-doc-callout-content">{children}</div>
    </aside>
  );
}
