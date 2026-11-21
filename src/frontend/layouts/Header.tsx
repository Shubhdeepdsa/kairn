import { Link } from "react-router";
import logo from "../assets/brand/kairn-logo.svg?no-inline";
import wordmark from "../assets/brand/kairn-with-text.svg?no-inline";
/** Application-wide header; feature pages must not recreate global chrome. */
export function Header() {
  return (
    <header className="app-header">
      <Link to="/" aria-label="Kairn home" className="app-brand">
        <picture>
          <source media="(max-width: 48rem)" srcSet={logo} />
          <img src={wordmark} alt="Kairn" />
        </picture>
      </Link>
      <span>Mineral · Component foundation</span>
      <nav aria-label="Application">
        <Link to="/design-system">Design system</Link>
        <a href="/">Open documentation reader</a>
      </nav>
    </header>
  );
}
