import { Outlet } from "react-router";
import { Header } from "./Header";
import { SearchProvider } from "../features/search/SearchContext";

/** Owns global chrome and the sole main region; nested layouts own their navigation only. */
export function AppShell() {
  return (
    <SearchProvider>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
    </SearchProvider>
  );
}
