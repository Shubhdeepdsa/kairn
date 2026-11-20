/** Global includes only explicit Library registrations; session scopes never register projects. */
export type SearchScope =
  | { readonly type: "global" }
  | { readonly type: "project"; readonly projectId: string };
/** Project/document IDs are opaque; fragments use the reader's shared Markdown heading algorithm. */
export interface DocumentDestination {
  readonly projectId: string;
  readonly documentId: string;
  readonly fragment?: string;
}
/** Plain user text, never raw FTS syntax. Limit is an integer in 1..50. */
export interface SearchRequest {
  readonly query: string;
  readonly scope: SearchScope;
  readonly limit: number;
  /** Bypass the short content coverage reuse window for an explicit user refresh. */
  readonly refresh?: boolean;
}
/** Browser-safe project identity; names may be duplicated. */
export interface SearchProject {
  readonly id: string;
  readonly name: string;
}
/** Every requested project has explicit coverage, including errors and incomplete indexing. */
export interface ProjectCoverage extends SearchProject {
  readonly status: "ready" | "indexing" | "partial" | "unavailable" | "error";
  readonly indexed: number;
  readonly total: number;
  readonly message?: string;
}
/** One result per document, choosing its best matching section. Snippets are plain text. */
export interface SearchResult extends DocumentDestination {
  readonly projectName: string;
  readonly documentTitle: string;
  readonly sourcePath: string;
  readonly heading: string;
  readonly snippet: string;
  readonly score: number;
}
/** Empty queries do not hide incomplete coverage; clients must show project statuses. */
export interface SearchResponse {
  readonly results: readonly SearchResult[];
  readonly coverage: readonly ProjectCoverage[];
}
/** Portable opaque route identities; session IDs are generated, never paths. */
export function isProjectId(id: string): boolean {
  return /^(?:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|session-[a-f0-9]{32})$/.test(
    id,
  );
}
