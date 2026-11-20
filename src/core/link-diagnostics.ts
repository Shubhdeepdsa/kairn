import type { DocumentService } from "./documents.js";
import { analyzeMarkdown } from "./markdown.js";
import { resolveDocumentLink } from "./document-links.js";
import type { LinkDiagnostic } from "./document-links.js";

/**
 * Check only one bounded document's unique parsed links, never crawl the project or
 * fetch external URLs. At most 32 targets/fragment reads; excess is reported explicitly.
 */
export async function diagnoseDocumentLinks(
  service: DocumentService,
  id: string,
  markdown: string,
): Promise<readonly LinkDiagnostic[]> {
  const links = analyzeMarkdown(markdown).links;
  const diagnostics: LinkDiagnostic[] = [];
  for (const target of links.slice(0, 32)) {
    const result = await resolveDocumentLink(service, id, target);
    if (result.kind === "diagnostic") diagnostics.push(result.diagnostic);
  }
  if (links.length > 32)
    diagnostics.push({
      documentId: id,
      target: "",
      code: "LIMIT_EXCEEDED",
      message: "Only the first 32 unique links were checked in this document.",
    });
  return diagnostics;
}
