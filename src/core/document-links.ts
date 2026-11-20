import { dirname, resolve } from "node:path";
import type { DocumentService } from "./documents.js";
import { analyzeMarkdown } from "./markdown.js";

/** Internal lookup identity. Never serialize canonicalPath into API output. */
export interface DocumentTarget {
  readonly id: string;
  readonly canonicalPath: string;
}
/** Browser-safe local link failure categories; no absolute destination paths. */
export type LinkCode =
  | "MISSING"
  | "EXCLUDED"
  | "UNREGISTERED"
  | "MISSING_FRAGMENT"
  | "INVALID"
  | "UNREADABLE"
  | "LIMIT_EXCEEDED";
/** One diagnostic retains only origin ID and the authored target. */
export interface LinkDiagnostic {
  readonly documentId: string;
  readonly target: string;
  readonly code: LinkCode;
  readonly message: string;
}
/** Link resolution never executes a URL or opens arbitrary filesystem paths. */
export type LinkResolution =
  | { kind: "document"; id: string; fragment: string }
  | { kind: "external"; href: string }
  | { kind: "diagnostic"; diagnostic: LinkDiagnostic };

/**
 * Resolve from canonical originating context against the effective document index.
 * Decode once, reject filesystem URLs/backslashes/control characters/absolute URLs,
 * and validate fragments using the renderer's unchanged heading algorithm.
 */
export async function resolveDocumentLink(
  service: DocumentService,
  documentId: string,
  target: string,
): Promise<LinkResolution> {
  const diagnostic = (code: LinkCode, message: string): LinkResolution => ({
    kind: "diagnostic",
    diagnostic: { documentId, target, code, message },
  });
  if (target.length > 1536 || /[\u0000-\u001f\u007f\\]/.test(target))
    return diagnostic("INVALID", "Invalid or oversized link target.");
  const scheme = /^([a-z][a-z\d+.-]*):/i.exec(target)?.[1]?.toLowerCase();
  if (scheme) {
    if (!["http", "https", "mailto"].includes(scheme))
      return diagnostic("INVALID", "This URL scheme is not supported.");
    try {
      const url = new URL(target);
      if (url.username || url.password)
        return diagnostic(
          "INVALID",
          "Credential-bearing links are not supported.",
        );
      return { kind: "external", href: url.href };
    } catch {
      return diagnostic("INVALID", "Malformed external URL.");
    }
  }
  const targets = service.linkTargets?.() ?? [];
  const origin = targets.find((entry) => entry.id === documentId);
  if (!origin)
    return diagnostic("UNREADABLE", "Origin document is no longer available.");
  let path: string, fragment: string;
  try {
    const index = target.indexOf("#");
    path = decodeURIComponent(index < 0 ? target : target.slice(0, index));
    fragment = index < 0 ? "" : decodeURIComponent(target.slice(index + 1));
  } catch {
    return diagnostic("INVALID", "Malformed percent encoding in link.");
  }
  if (
    path.startsWith("/") ||
    /[\\\u0000-\u001f\u007f?:]/.test(path) ||
    /[\u0000-\u001f\u007f]/.test(fragment)
  )
    return diagnostic(
      "INVALID",
      "Only relative Markdown paths and heading fragments are supported.",
    );
  const physical = path
    ? resolve(dirname(origin.canonicalPath), path)
    : origin.canonicalPath;
  const found = targets.find((entry) => entry.canonicalPath === physical);
  if (!found) {
    const code = service.classifyLinkTarget?.(physical) ?? "UNREGISTERED";
    return diagnostic(
      code,
      code === "EXCLUDED"
        ? "Destination is excluded by the current documentation rules."
        : code === "MISSING"
          ? "Markdown destination is missing. Check its relative path."
          : "Destination is not a registered readable Markdown document. Add it as a source if intended.",
    );
  }
  if (fragment) {
    try {
      const content = await service.read(found.id);
      if (
        !analyzeMarkdown(content.markdown).headings.some(
          (h) => h.fragment === fragment,
        )
      )
        return diagnostic(
          "MISSING_FRAGMENT",
          "The heading fragment does not exist in the destination document.",
        );
    } catch {
      return diagnostic(
        "UNREADABLE",
        "Destination could not be read safely. Retry after the file is saved.",
      );
    }
  }
  return { kind: "document", id: found.id, fragment };
}
