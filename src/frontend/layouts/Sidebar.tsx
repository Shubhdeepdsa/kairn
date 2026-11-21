import { useId, useState } from "react";
import { SidebarItem } from "../components/ui/SidebarItem";
import { Button } from "../components/ui/Button";
import { Icon } from "../icons/Icon";
/** One local disclosure implementation for all configured navigation regions. */
export function Sidebar({
  label,
  items,
}: {
  label: string;
  items: readonly { to: string; label: string }[];
}) {
  const [expanded, setExpanded] = useState(true);
  const id = useId();
  return (
    <aside className="sidebar">
      <Button
        variant="ghost"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded((value) => !value)}
      >
        <Icon name="sidebar" />
        {expanded ? "Collapse" : "Expand"} {label}
      </Button>
      <nav id={id} aria-label={label} hidden={!expanded}>
        <ul>
          {items.map((item) => (
            <li key={item.to}>
              <SidebarItem end to={item.to}>
                {item.label}
              </SidebarItem>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
