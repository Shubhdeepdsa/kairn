import { forwardRef } from "react";
import type { MouseEvent } from "react";

export interface SafeHtmlArticleProps {
  /**
   * Pre-rendered HTML strictly produced by Kairn's server Markdown renderer.
   * NEVER supply raw user input, diagnostics, filenames, or API errors.
   */
  readonly html: string;
  readonly onAnchorClick?:
    ((event: MouseEvent<HTMLElement>) => void) | undefined;
  readonly className?: string | undefined;
}

/**
 * SafeHtmlArticle renders HTML produced exclusively by Kairn's server-side
 * safe Markdown pipeline (`src/core/markdown.ts` via `DocumentResponse.html`).
 *
 * TRUST BOUNDARY INVARIANTS:
 * 1. The input HTML must only originate from validated server `DocumentResponse.html`.
 * 2. `markdown.ts` runs markdown-it with `html: false`, which escapes all authored HTML tags.
 * 3. Link schemes are restricted by `validateLink` to http, https, mailto, and relative targets.
 * 4. Image tags are replaced with safe textual placeholders (`[Image: ...]`).
 * 5. Script execution and external network fetches are blocked by server CSP.
 * 6. User-supplied diagnostics, filenames, or API error text must NEVER be passed as HTML.
 */
export const SafeHtmlArticle = forwardRef<HTMLDivElement, SafeHtmlArticleProps>(
  function SafeHtmlArticle({ html, onAnchorClick, className = "" }, ref) {
    return (
      <div
        ref={ref}
        className={`kairn-prose doc-reader-content ${className}`.trim()}
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={onAnchorClick}
      />
    );
  },
);
