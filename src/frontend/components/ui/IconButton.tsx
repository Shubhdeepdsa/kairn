import { Button } from "./Button";
import type { ButtonProps } from "./Button";
import { Icon } from "../../icons/Icon";
import type { IconName } from "../../icons/registry";
/** Labeled action with a decorative icon; avoid redundant SVG announcements. */
export function IconButton({
  label,
  icon,
  className = "",
  ...props
}: Omit<ButtonProps, "children" | "aria-label"> & {
  label: string;
  icon: IconName;
}) {
  return (
    <Button
      {...props}
      aria-label={label}
      className={`ui-icon-button ${className}`.trim()}
    >
      <Icon name={icon} />
    </Button>
  );
}
