import { Link } from "react-router";
import markLight from "../assets/brand/kairn-mark-light.svg?no-inline";
import markDark from "../assets/brand/kairn-mark-dark.svg?no-inline";
import wordmarkLight from "../assets/brand/kairn-wordmark-light.svg?no-inline";
import wordmarkDark from "../assets/brand/kairn-wordmark-dark.svg?no-inline";
import { useTheme } from "../app/providers/ThemeProvider";
import { useSearch } from "../features/search/SearchContext";
import { SearchTrigger } from "../features/search/SearchTrigger";

/** Application-wide header; feature pages must not recreate global chrome. */
export function Header() {
  const { appearance } = useTheme();
  const { openSearch } = useSearch();
  const dark = appearance === "dark";

  return (
    <header className="app-header">
      <Link to="/" aria-label="Kairn home" className="app-brand">
        <picture>
          {appearance === "system" && (
            <source
              media="(max-width: 48rem) and (prefers-color-scheme: dark)"
              srcSet={markDark}
            />
          )}
          <source
            media="(max-width: 48rem)"
            srcSet={dark ? markDark : markLight}
          />
          {appearance === "system" && (
            <source
              media="(prefers-color-scheme: dark)"
              srcSet={wordmarkDark}
            />
          )}
          <img src={dark ? wordmarkDark : wordmarkLight} alt="Kairn" />
        </picture>
      </Link>

      <div className="app-header-search">
        <SearchTrigger onClick={() => openSearch()} />
      </div>

      <nav aria-label="Application">
        <Link to="/design-system">Design system</Link>
        <a href="/">Open documentation reader</a>
      </nav>
    </header>
  );
}
