import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import type { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router";
import type {
  SearchProject,
  NavigationDestination,
} from "../../../core/search-contracts.js";
import { useApplication } from "../../app/providers/ApplicationProvider";
import { SearchPaletteDialog } from "./SearchPaletteDialog";

interface SearchContextValue {
  openSearch: (project?: SearchProject) => void;
  closeSearch: () => void;
  isSearchOpen: boolean;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { readonly children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const { current, projects } = useApplication();
  const location = useLocation();
  const navigate = useNavigate();

  // Extract projectId from pathname if present (e.g. /projects/:id/...)
  const match = /^\/projects\/([^/]+)/.exec(location.pathname);
  const routeProjectId = match ? match[1] : undefined;

  const activeProject = useMemo(() => {
    if (routeProjectId) {
      return (
        projects.find((p) => p.id === routeProjectId) ??
        (current.id === routeProjectId ? current : undefined)
      );
    }
    return current;
  }, [routeProjectId, projects, current]);

  const openSearch = useCallback(() => setIsOpen(true), []);
  const closeSearch = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.altKey &&
        e.key.toLowerCase() === "k"
      ) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleNavigate = useCallback(
    (dest: NavigationDestination) => {
      if (dest.documentId) {
        navigate(
          `/projects/${dest.projectId}/docs/${dest.documentId}${
            dest.fragment ? `#${encodeURIComponent(dest.fragment)}` : ""
          }`,
        );
      } else {
        navigate(`/projects/${dest.projectId}/docs`);
      }
    },
    [navigate],
  );

  return (
    <SearchContext.Provider
      value={{ openSearch, closeSearch, isSearchOpen: isOpen }}
    >
      {children}
      <SearchPaletteDialog
        isOpen={isOpen}
        onClose={closeSearch}
        activeProject={activeProject}
        onNavigate={handleNavigate}
      />
    </SearchContext.Provider>
  );
}

export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("SearchProvider is required.");
  return ctx;
}
