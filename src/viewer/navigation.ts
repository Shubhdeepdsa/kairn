import type { DocumentEntry, NavigationEntry } from "../core/documents.js";
export { parseReaderLocation, readerHash } from "../core/reader-location.js";
export type { ReaderLocation } from "../core/reader-location.js";

/** Match initial-reader selection: legacy root README first, otherwise the first approved tree document. */
export function defaultReaderDocument(
  tree: readonly NavigationEntry[],
): DocumentEntry | undefined {
  const files = flatten(tree);
  return (
    files.find((entry) => !entry.sourceId && entry.path === "README.md") ??
    files[0]
  );
}
function flatten(tree: readonly NavigationEntry[]): DocumentEntry[] {
  return tree.flatMap((entry) =>
    entry.kind === "document" ? [entry] : flatten(entry.children),
  );
}
