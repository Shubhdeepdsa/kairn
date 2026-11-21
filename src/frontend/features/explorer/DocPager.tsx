import { Icon } from "../../icons/Icon";
import { Button } from "../../components/ui/Button";

export interface DocPagerItem {
  readonly title: string;
  readonly id?: string | undefined;
  readonly to?: string | undefined;
}

export interface DocPagerProps {
  readonly previous?: DocPagerItem | undefined;
  readonly next?: DocPagerItem | undefined;
  readonly onSelect?: ((id: string) => void) | undefined;
}

/**
 * Sequential document footer pager card grid.
 */
export function DocPager({ previous, next, onSelect }: DocPagerProps) {
  if (!previous && !next) return null;

  return (
    <nav className="doc-pager" aria-label="Document pagination">
      {previous ? (
        <Button
          variant="ghost"
          className="doc-pager-card doc-pager-prev"
          onClick={() => previous.id && onSelect?.(previous.id)}
        >
          <span className="doc-pager-label">
            <Icon name="arrowLeft" className="icon-sm" />
            <span>Previous</span>
          </span>
          <span className="doc-pager-title">{previous.title}</span>
        </Button>
      ) : (
        <div aria-hidden="true" />
      )}
      {next ? (
        <Button
          variant="ghost"
          className="doc-pager-card doc-pager-next"
          onClick={() => next.id && onSelect?.(next.id)}
        >
          <span className="doc-pager-label">
            <span>Next</span>
            <Icon name="arrowRight" className="icon-sm" />
          </span>
          <span className="doc-pager-title">{next.title}</span>
        </Button>
      ) : (
        <div aria-hidden="true" />
      )}
    </nav>
  );
}
