import { useState } from "react";
import type { Ref, MouseEvent } from "react";
import type { DocumentResponse, LinkDiagnostic } from "../../lib/api/types.js";
import { Icon } from "../../icons/Icon";
import { Button } from "../../components/ui/Button";
import { DocCallout } from "../../components/ui/DocCallout";
import { DocPager } from "./DocPager";
import type { DocPagerItem } from "./DocPager";
import { SafeHtmlArticle } from "./SafeHtmlArticle";

export interface DocReaderProps {
  readonly document: DocumentResponse;
  readonly projectName?: string | undefined;
  readonly previousDoc?: DocPagerItem | undefined;
  readonly nextDoc?: DocPagerItem | undefined;
  readonly onSelectDoc?: ((id: string) => void) | undefined;
  readonly onSelectHeading?: ((fragment: string) => void) | undefined;
  readonly onNavigateLink?: ((href: string) => void) | undefined;
  readonly onCopyPath?: (() => void) | undefined;
  readonly activeDiagnostic?: LinkDiagnostic | null | undefined;
  readonly articleRef?: Ref<HTMLDivElement> | undefined;
}

/**
 * Central documentation reading plane.
 * Renders document breadcrumbs, header metadata, server-safe HTML article, diagnostics, and pager.
 */
export function DocReader({
  document,
  projectName = "marketing-backend",
  previousDoc,
  nextDoc,
  onSelectDoc,
  onSelectHeading,
  onNavigateLink,
  onCopyPath,
  activeDiagnostic,
  articleRef,
}: DocReaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (onCopyPath) {
      onCopyPath();
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(document.path);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleArticleClick = (event: MouseEvent<HTMLElement>) => {
    const link = (
      event.target as HTMLElement | null
    )?.closest<HTMLAnchorElement>("a");
    if (!link) return;

    // Preserve new-window / new-tab behaviors with modifier keys
    if (
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const href = link.getAttribute("href") ?? "";

    // Internal heading anchor in current document
    if (href.startsWith("#")) {
      event.preventDefault();
      const fragment = decodeURIComponent(href.slice(1));
      onSelectHeading?.(fragment);
      return;
    }

    // External link: allowed schemes (http, https, mailto) open natively in new tab
    if (/^(https?:|mailto:)/i.test(href)) {
      return;
    }

    // Relative Markdown document link handled through core link resolution
    event.preventDefault();
    onNavigateLink?.(href);
  };

  const pathParts = document.path.split("/");
  const fileName = pathParts.pop() ?? document.path;

  return (
    <article className="doc-reader" aria-labelledby="doc-reader-title">
      {/* Utility strip / breadcrumbs */}
      <div className="doc-reader-breadcrumbs-bar">
        <nav className="doc-reader-breadcrumbs" aria-label="Document path">
          <ol>
            <li>
              <span>{projectName}</span>
            </li>
            {pathParts.map((part) => (
              <li key={part}>
                <span>{part}</span>
              </li>
            ))}
            <li>
              <span
                className="doc-reader-breadcrumb-current"
                aria-current="page"
              >
                {fileName}
              </span>
            </li>
          </ol>
        </nav>
        <Button
          variant="ghost"
          size="sm"
          className="doc-reader-copy-btn"
          onClick={handleCopy}
          aria-label={
            copied ? "Path copied to clipboard" : "Copy document path"
          }
          title="Copy path"
        >
          <Icon name={copied ? "check" : "copy"} className="icon-sm" />
          <span>{copied ? "Copied" : "Copy path"}</span>
        </Button>
      </div>

      {/* Document Title & Metadata */}
      <header className="doc-reader-header">
        <h1 id="doc-reader-title" className="doc-reader-title">
          {document.title}
        </h1>
        {document.revision && (
          <div className="doc-reader-meta">
            <div
              className="doc-reader-history-link"
              title={`Content revision: ${document.revision}`}
            >
              <Icon name="history" className="icon-sm" />
              <span>Revision {document.revision.slice(0, 8)}</span>
            </div>
          </div>
        )}
      </header>

      {/* Static scan-time diagnostics */}
      {document.diagnostics && document.diagnostics.length > 0 && (
        <aside
          className="doc-reader-diagnostics"
          aria-label="Document link diagnostics"
        >
          <DocCallout
            title="Document Link Diagnostics"
            icon="wayfinding"
            role="status"
          >
            <ul className="doc-reader-diagnostics-list">
              {document.diagnostics.map((diag, idx) => (
                <li key={idx}>
                  <span>{diag.message}</span>
                  {diag.target && (
                    <span className="doc-reader-diag-target">
                      {" "}
                      ({diag.target})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </DocCallout>
        </aside>
      )}

      {/* Runtime link resolution diagnostic */}
      {activeDiagnostic && (
        <aside
          className="doc-reader-runtime-diagnostic"
          aria-label="Link resolution warning"
        >
          <DocCallout
            title="Link Resolution Warning"
            icon="wayfinding"
            role="alert"
          >
            <p>
              <span>{activeDiagnostic.message}</span>
              {activeDiagnostic.target && (
                <span className="doc-reader-diag-target">
                  {" "}
                  ({activeDiagnostic.target})
                </span>
              )}
            </p>
          </DocCallout>
        </aside>
      )}

      {/* Rendered HTML content or fallback */}
      {document.html ? (
        <SafeHtmlArticle
          ref={articleRef}
          html={document.html}
          onAnchorClick={handleArticleClick}
        />
      ) : (
        <div ref={articleRef} className="kairn-prose doc-reader-content">
          <p>{document.markdown}</p>
        </div>
      )}

      {/* Footer Pager */}
      <DocPager previous={previousDoc} next={nextDoc} onSelect={onSelectDoc} />
    </article>
  );
}
