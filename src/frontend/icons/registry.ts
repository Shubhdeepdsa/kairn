import type { SvgIconComponent } from "./types";
export type { SvgIconProps, SvgIconComponent } from "./types";
import { Wayfinding } from "./custom/Wayfinding";
import { BookOpen, Library, Settings, PanelLeft } from "lucide-react";
export type IconName =
  "documentation" | "library" | "settings" | "sidebar" | "wayfinding";
/** Semantic keys isolate consumers from the SVG provider; swap entries here without changing Icon callers. */
export const iconRegistry: Readonly<Record<IconName, SvgIconComponent>> = {
  documentation: BookOpen,
  library: Library,
  settings: Settings,
  sidebar: PanelLeft,
  wayfinding: Wayfinding,
};
