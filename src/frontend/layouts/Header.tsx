import { Link } from "react-router";
import { Icon } from "../icons/Icon";
/** Application-wide header; feature pages must not recreate global chrome. */
export function Header() {
  return (
    <header className="app-header">
      <Link to="/">
        <Icon name="wayfinding" />
        Kairn
      </Link>
      <span>Mineral · Component foundation</span>
      <nav aria-label="Application">
        <Link to="/design-system">Design system</Link>
        <a href="/">Open documentation reader</a>
      </nav>
    </header>
  );
}
