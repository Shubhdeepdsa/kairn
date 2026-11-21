import { Outlet } from "react-router";
import { Header } from "./Header";
/** Owns global chrome and the sole main region; nested layouts own their navigation only. */
export function AppShell() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
    </>
  );
}
