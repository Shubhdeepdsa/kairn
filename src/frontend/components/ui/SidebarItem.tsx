import { NavLink } from "react-router";
import type { ComponentPropsWithRef } from "react";
/** One active/focus/wayfinding contract shared by every sidebar configuration. */
export function SidebarItem({
  className = "",
  ...props
}: Omit<ComponentPropsWithRef<typeof NavLink>, "className"> & {
  className?: string;
}) {
  return (
    <NavLink {...props} className={`ui-sidebar-item ${className}`.trim()} />
  );
}
