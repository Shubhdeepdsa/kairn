import { iconRegistry } from "./registry";
import type { IconName } from "./registry";
/** Decorative by default; meaningful icons require an explicit accessible label. */
export type IconProps = {
  name: IconName;
  size?: "sm" | "md" | "lg";
  className?: string;
} & (
  { decorative?: true; label?: never } | { decorative: false; label: string }
);
export function Icon({
  name,
  size = "md",
  className = "",
  ...accessibility
}: IconProps) {
  const Component = iconRegistry[name];
  if (accessibility.decorative === false && !accessibility.label.trim())
    throw new Error("Meaningful icons require a label.");
  return (
    <Component
      className={`ui-icon icon-${size} ${className}`.trim()}
      focusable="false"
      aria-hidden={accessibility.decorative === false ? undefined : true}
      role={accessibility.decorative === false ? "img" : undefined}
      aria-label={
        accessibility.decorative === false ? accessibility.label : undefined
      }
    />
  );
}
