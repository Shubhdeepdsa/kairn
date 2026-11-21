import { useState } from "react";
import type { DocumentResponse } from "../design-system/explorer-fixtures";
import { Icon } from "../../icons/Icon";
import { Button } from "../../components/ui/Button";
import { DocPager } from "./DocPager";
import type { DocPagerItem } from "./DocPager";

export interface DocReaderProps {
  readonly document: DocumentResponse;
  readonly projectName?: string | undefined;
  readonly previousDoc?: DocPagerItem | undefined;
  readonly nextDoc?: DocPagerItem | undefined;
  readonly onSelectDoc?: ((id: string) => void) | undefined;
  readonly onCopyPath?: (() => void) | undefined;
}

/**
 * Central documentation reading plane.
 * Renders document breadcrumbs, header metadata, server-safe HTML article, and pager.
 */
export function DocReader({
  document,
  projectName = "marketing-backend",
  previousDoc,
  nextDoc,
  onSelectDoc,
  onCopyPath,
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
        <div className="doc-reader-meta">
          <span>Updated May 2026</span>
          <span className="doc-reader-meta-dot" aria-hidden="true">
            ·
          </span>
          <div className="doc-reader-author">
            <span className="doc-reader-author-badge">KB</span>
            <span>Engineering Core</span>
          </div>
          <span className="doc-reader-meta-dot" aria-hidden="true">
            ·
          </span>
          <div className="doc-reader-history-link">
            <Icon name="history" className="icon-sm" />
            <span>rev: {document.revision.slice(0, 10)}</span>
          </div>
        </div>
      </header>

      {/* Rendered HTML content */}
      {document.html ? (
        <div
          className="kairn-prose doc-reader-content"
          dangerouslySetInnerHTML={{ __html: document.html }}
        />
      ) : (
        <div className="kairn-prose doc-reader-content">
          <p>{document.markdown}</p>
        </div>
      )}

      {/* Footer Pager */}
      <DocPager previous={previousDoc} next={nextDoc} onSelect={onSelectDoc} />
    </article>
  );
}
