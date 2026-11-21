import type { NavigationEntry, DocumentEntry } from "../../lib/api/types.js";

/**
 * Flatten a hierarchical NavigationEntry tree into a sequential list of DocumentEntry items.
 * Preserves the deterministic directory-before-file order from the server.
 */
export function flattenTree(
  tree: readonly NavigationEntry[],
): readonly DocumentEntry[] {
  return tree.flatMap((entry): readonly DocumentEntry[] =>
    entry.kind === "document" ? [entry] : flattenTree(entry.children),
  );
}

/**
 * Select default document matching Phase 5 initial-reader behavior:
 * Primary project README.md first, otherwise the first approved tree document.
 */
export function findDefaultDocument(
  tree: readonly NavigationEntry[],
): DocumentEntry | undefined {
  const files = flattenTree(tree);
  return (
    files.find((entry) => !entry.sourceId && entry.path === "README.md") ??
    files[0]
  );
}

/**
 * Find a document entry by its 64-char hex document ID.
 */
export function findDocumentById(
  tree: readonly NavigationEntry[],
  id: string,
): DocumentEntry | undefined {
  const files = flattenTree(tree);
  return files.find((entry) => entry.id === id);
}

/**
 * Derive previous and next documents for sequential reader pager navigation.
 */
export function getPreviousNextDocuments(
  tree: readonly NavigationEntry[],
  activeId: string,
): {
  readonly previous?: DocumentEntry | undefined;
  readonly next?: DocumentEntry | undefined;
} {
  const files = flattenTree(tree);
  const index = files.findIndex((entry) => entry.id === activeId);
  if (index === -1) {
    return { previous: undefined, next: undefined };
  }
  return {
    previous: index > 0 ? files[index - 1] : undefined,
    next: index < files.length - 1 ? files[index + 1] : undefined,
  };
}
