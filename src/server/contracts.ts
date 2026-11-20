import type { Heading } from "../core/markdown.js";
import type { LinkDiagnostic } from "../core/document-links.js";
/** Browser-safe active-document response. Revision includes source and current navigation; canonical paths are omitted. */
export interface DocumentResponse {
  readonly id: string;
  readonly path: string;
  readonly title: string;
  readonly markdown: string;
  readonly revision: string;
  readonly html?: string;
  readonly headings: readonly Heading[];
  readonly diagnostics: readonly LinkDiagnostic[];
}
