import { Outlet } from "react-router";
import { Header } from "./Header";
import { SearchProvider } from "../features/search/SearchContext";

/** Owns global chrome and the sole main region; nested layouts own their navigation only. */
export function AppShell() {
  return (
    <div className="app-shell">
      <SearchProvider>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header />
        <main id="main" tabIndex={-1} className="app-main">
          <Outlet />
        </main>
      </SearchProvider>
    </div>
  );
}
