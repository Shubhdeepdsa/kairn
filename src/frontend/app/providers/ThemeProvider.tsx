import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
/** Runtime demonstration only. Persistent preferences must eventually be core-owned. */
export type Appearance = "light" | "dark" | "system";
const ThemeContext = createContext<{
  appearance: Appearance;
  setAppearance(value: Appearance): void;
} | null>(null);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance>("system");
  useEffect(() => {
    const root = document.documentElement;
    const before = root.getAttribute("data-theme");
    root.setAttribute("data-theme", appearance);
    return () => {
      if (before === null) root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", before);
    };
  }, [appearance]);
  return (
    <ThemeContext value={{ appearance, setAppearance }}>
      {children}
    </ThemeContext>
  );
}
export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("ThemeProvider is required.");
  return value;
}
