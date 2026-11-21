import type { SvgIconComponent } from "./types";
export type { SvgIconProps, SvgIconComponent } from "./types";
import { Wayfinding } from "./custom/Wayfinding";
import {
  BookOpen,
  Library,
  Settings,
  PanelLeft,
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Copy,
  History,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Search,
  ExternalLink,
  Check,
} from "lucide-react";

export type IconName =
  | "documentation"
  | "library"
  | "settings"
  | "sidebar"
  | "wayfinding"
  | "folder"
  | "folderOpen"
  | "file"
  | "chevronRight"
  | "chevronDown"
  | "copy"
  | "history"
  | "refresh"
  | "arrowLeft"
  | "arrowRight"
  | "search"
  | "external"
  | "check";

/** Semantic keys isolate consumers from the SVG provider; swap entries here without changing Icon callers. */
export const iconRegistry: Readonly<Record<IconName, SvgIconComponent>> = {
  documentation: BookOpen,
  library: Library,
  settings: Settings,
  sidebar: PanelLeft,
  wayfinding: Wayfinding,
  folder: Folder,
  folderOpen: FolderOpen,
  file: FileText,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  copy: Copy,
  history: History,
  refresh: RefreshCw,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  search: Search,
  external: ExternalLink,
  check: Check,
};
