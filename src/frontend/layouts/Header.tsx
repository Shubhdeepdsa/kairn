import { Link } from "react-router";
import { Icon } from "../icons/Icon";
/** Application-wide header; feature pages must not recreate global chrome. */
export function Header() {
  return (
    <header className="app-header">
      <Link to="/">
        <Icon name="documentation" />
        Kairn
      </Link>
      <span>React foundation · Phase 6A</span>
      <a href="/">Open documentation reader</a>
    </header>
  );
}
