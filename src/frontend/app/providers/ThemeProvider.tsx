import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
/** Runtime demonstration only. Persistent preferences must eventually be core-owned. */
export type Appearance = "light" | "dark" | "system";
export type AccentPalette = "mineral" | "blue" | "forest";
const ThemeContext = createContext<{
  appearance: Appearance;
  accent: AccentPalette;
  setAccent(value: AccentPalette): void;
  setAppearance(value: Appearance): void;
} | null>(null);
/** Initial values are an injection point for future validated core preferences; no persistence is performed. */
export function ThemeProvider({
  children,
  initialAppearance = "system",
  initialAccent = "mineral",
}: {
  children: ReactNode;
  initialAppearance?: Appearance;
  initialAccent?: AccentPalette;
}) {
  const [appearance, setAppearance] = useState<Appearance>(initialAppearance);
  const [accent, setAccent] = useState<AccentPalette>(initialAccent);
  useEffect(() => {
    const root = document.documentElement;
    const before = root.getAttribute("data-theme");
    const beforeAccent = root.getAttribute("data-accent");
    root.setAttribute("data-theme", appearance);
    root.setAttribute("data-accent", accent);
    return () => {
      if (before === null) root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", before);
      if (beforeAccent === null) root.removeAttribute("data-accent");
      else root.setAttribute("data-accent", beforeAccent);
    };
  }, [appearance, accent]);
  return (
    <ThemeContext value={{ appearance, setAppearance, accent, setAccent }}>
      {children}
    </ThemeContext>
  );
}
export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("ThemeProvider is required.");
  return value;
}
