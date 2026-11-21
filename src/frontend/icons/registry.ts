import { BookOpen, Library, Settings, PanelLeft } from "lucide-react";
/** Semantic keys isolate consumers from the SVG provider; replace entries with compatible custom SVG components. */
export const iconRegistry = {
  documentation: BookOpen,
  library: Library,
  settings: Settings,
  sidebar: PanelLeft,
} as const;
export type IconName = keyof typeof iconRegistry;
