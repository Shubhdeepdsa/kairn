import type { ComponentType, SVGProps } from "react";
import { BookOpen, Library, Settings, PanelLeft } from "lucide-react";
/**
 * Provider-neutral SVG contract. Custom icons forward these props onto their root
 * svg, supply a viewBox, and use currentColor. Icon owns sizing and accessibility.
 * Do not bake in a title, color, inline style or focus behavior in registry entries.
 */
export type SvgIconProps = SVGProps<SVGSVGElement>;
/** Accepts ordinary custom SVG components as well as Lucide's ref-capable components. */
export type SvgIconComponent = ComponentType<SvgIconProps>;
export type IconName = "documentation" | "library" | "settings" | "sidebar";
/** Semantic keys isolate consumers from the SVG provider; swap entries here without changing Icon callers. */
export const iconRegistry: Readonly<Record<IconName, SvgIconComponent>> = {
  documentation: BookOpen,
  library: Library,
  settings: Settings,
  sidebar: PanelLeft,
};
