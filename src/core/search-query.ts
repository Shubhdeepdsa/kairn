import { searchableText } from "./search-extraction.js";
import { isProjectId } from "./search-contracts.js";
import type {
  SearchRequest,
  SearchResult,
  SearchProject,
} from "./search-contracts.js";
import type { SearchIndex } from "./search-index.js";
/** Adapter-safe query failure: no SQLite errors or local paths. */
export class SearchQueryError extends Error {}
/** Validate plain input independently of MATCH; punctuation/operators cannot become FTS grammar. */
export function searchTerms(request: SearchRequest): readonly string[] {
  if (
    typeof request.query !== "string" ||
    request.query.length > 256 ||
    /[\u0000-\u001f\u007f]/.test(request.query) ||
    !Number.isInteger(request.limit) ||
    request.limit < 1 ||
    request.limit > 50 ||
    !request.scope ||
    !["global", "project"].includes(request.scope.type) ||
    (request.scope.type === "project" && !isProjectId(request.scope.projectId))
  )
    throw new SearchQueryError(
      "Use at most 256 characters, 16 words, and a result limit from 1 to 50 with a valid scope.",
    );
  const words = [
    ...new Set(searchableText(request.query).match(/[\p{L}\p{N}_]+/gu) ?? []),
  ];
  if (words.length > 16)
    throw new SearchQueryError("Use at most 16 search words.");
  return words;
}
function snippet(text: string, terms: readonly string[]): string {
  const plain = text.replace(/\s+/g, " ").trim();
  const lower = plain.toLocaleLowerCase();
  const first = Math.min(
    ...terms.map((t) => lower.indexOf(t)).filter((i) => i >= 0),
  );
  const start = Number.isFinite(first) ? Math.max(0, first - 65) : 0;
  return `${start ? "…" : ""}${plain.slice(start, start + 230)}${plain.length > start + 230 ? "…" : ""}`;
}
/**
 * One project/global ranking engine. Call only with freshly validated eligible project IDs.
 * Group by project/document, choose best section, and keep title relevance above repeated body hits.
 * SQL bindings protect statements; quoted alphanumeric tokens independently protect MATCH syntax.
 */
export function querySearchIndex(
  index: SearchIndex,
  request: SearchRequest,
  projects: readonly SearchProject[],
): readonly SearchResult[] {
  const terms = searchTerms(request);
  if (!terms.length) return [];
  const scope = request.scope;
  const eligible = projects.filter(
    (p) => scope.type === "global" || p.id === scope.projectId,
  );
  if (!eligible.length) return [];
  const names = new Map(eligible.map((p) => [p.id, p.name]));
  const match = terms.map((t) => `"${t}"*`).join(" AND ");
  const ids = eligible.map((p) => p.id);
  const rows = index.database
    .prepare(
      `SELECT sections.*, documents.metadata, bm25(sections,0,0,0,0,0,0,0,0,10,6,4,2,1) relevance FROM sections JOIN documents ON documents.project=sections.project AND documents.document=sections.document WHERE sections MATCH ? AND sections.project IN (${ids.map(() => "?").join(",")}) ORDER BY relevance LIMIT 2000`,
    )
    .all(match, ...ids);
  const grouped = new Map<string, SearchResult>();
  for (const r of rows) {
    const all = (value: unknown): boolean =>
      terms.every((t) => String(value).includes(t));
    const title = String(r.document_title);
    const tier =
      title.normalize("NFKC").toLowerCase().trim() ===
      request.query.normalize("NFKC").toLowerCase().trim()
        ? 6
        : all(r.title)
          ? 5
          : all(r.heading)
            ? 4
            : all(r.path)
              ? 3
              : all(r.body)
                ? 2
                : 1;
    const relevance = Math.max(0, -Number(r.relevance));
    const score = tier + relevance / (1 + relevance) / 100;
    const key = String(r.project) + ":" + String(r.document);
    const result: SearchResult = {
      projectId: String(r.project),
      documentId: String(r.document),
      fragment: String(r.fragment),
      projectName: names.get(String(r.project))!,
      documentTitle: title,
      sourcePath: (JSON.parse(String(r.metadata)) as { path: string }).path,
      heading: String(r.label),
      snippet: snippet(
        tier === 1
          ? String(r.original_code)
          : String(r.original_body) || String(r.label) || title,
        terms,
      ),
      score,
    };
    const before = grouped.get(key);
    if (!before || score > before.score) grouped.set(key, result);
  }
  return [...grouped.values()]
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.projectId.localeCompare(b.projectId) ||
        a.documentId.localeCompare(b.documentId),
    )
    .slice(0, request.limit);
}
