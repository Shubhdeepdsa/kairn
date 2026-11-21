import { describe, it, expect } from "vitest";
import {
  flattenTree,
  findDefaultDocument,
  findDocumentById,
  getPreviousNextDocuments,
} from "../../src/frontend/features/explorer/navigation-tree";
import type { NavigationEntry } from "../../src/frontend/lib/api/types";

const doc1 = {
  kind: "document" as const,
  id: "1".repeat(64),
  path: "guide.md",
  title: "Guide",
};
const doc2 = {
  kind: "document" as const,
  id: "2".repeat(64),
  path: "README.md",
  title: "Readme",
};
const externalDoc = {
  kind: "document" as const,
  id: "3".repeat(64),
  path: "external/README.md",
  title: "External Readme",
  sourceId: "source-ext",
};
const nestedDoc = {
  kind: "document" as const,
  id: "4".repeat(64),
  path: "architecture/db.md",
  title: "Database",
};

const tree: readonly NavigationEntry[] = [
  doc1,
  {
    kind: "directory" as const,
    path: "architecture",
    title: "Architecture",
    children: [nestedDoc],
  },
  doc2,
  {
    kind: "directory" as const,
    path: "source-ext",
    title: "External",
    children: [externalDoc],
  },
];

describe("navigation-tree utilities", () => {
  it("flattens hierarchical tree preserving traversal order", () => {
    const flat = flattenTree(tree);
    expect(flat.map((d) => d.id)).toEqual([
      doc1.id,
      nestedDoc.id,
      doc2.id,
      externalDoc.id,
    ]);
  });

  it("selects primary project README.md as default document first", () => {
    const defaultDoc = findDefaultDocument(tree);
    expect(defaultDoc).toEqual(doc2);
  });

  it("falls back to first document if no primary README.md exists", () => {
    const noReadmeTree: readonly NavigationEntry[] = [doc1, nestedDoc];
    const defaultDoc = findDefaultDocument(noReadmeTree);
    expect(defaultDoc).toEqual(doc1);
  });

  it("returns undefined for empty tree", () => {
    expect(findDefaultDocument([])).toBeUndefined();
  });

  it("finds document by id", () => {
    expect(findDocumentById(tree, nestedDoc.id)).toEqual(nestedDoc);
    expect(findDocumentById(tree, "non-existent")).toBeUndefined();
  });

  it("computes previous and next documents correctly", () => {
    // First doc has no previous, next is nestedDoc
    const firstPager = getPreviousNextDocuments(tree, doc1.id);
    expect(firstPager.previous).toBeUndefined();
    expect(firstPager.next).toEqual(nestedDoc);

    // Middle doc has both previous and next
    const middlePager = getPreviousNextDocuments(tree, nestedDoc.id);
    expect(middlePager.previous).toEqual(doc1);
    expect(middlePager.next).toEqual(doc2);

    // Last doc has previous, no next
    const lastPager = getPreviousNextDocuments(tree, externalDoc.id);
    expect(lastPager.previous).toEqual(doc2);
    expect(lastPager.next).toBeUndefined();

    // Unknown doc has neither
    const unknownPager = getPreviousNextDocuments(tree, "unknown");
    expect(unknownPager.previous).toBeUndefined();
    expect(unknownPager.next).toBeUndefined();
  });
});
