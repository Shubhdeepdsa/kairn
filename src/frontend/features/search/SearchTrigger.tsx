import { Button } from "../../components/ui/Button";
import { Icon } from "../../icons/Icon";

export interface SearchTriggerProps {
  readonly onClick: () => void;
  readonly className?: string | undefined;
}

/**
 * Global search palette trigger button.
 * Matches Stitch specifications with search icon and ⌘K / Ctrl+K keyboard shortcut hint.
 */
export function SearchTrigger({ onClick, className = "" }: SearchTriggerProps) {
  return (
    <Button
      variant="secondary"
      size="sm"
      className={`search-trigger-btn ${className}`.trim()}
      onClick={onClick}
      aria-label="Search documentation (Command or Control K)"
      title="Search documentation (Cmd+K / Ctrl+K)"
    >
      <Icon name="search" className="icon-sm" />
      <span className="search-trigger-label">Search documentation…</span>
      <kbd className="search-trigger-kbd">⌘K</kbd>
    </Button>
  );
}
