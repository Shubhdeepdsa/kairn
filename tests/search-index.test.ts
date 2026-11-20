import { mkdtemp, readFile, rm, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { SearchIndex } from "../src/core/search-index.js";
import type { IndexDocument } from "../src/core/search-index.js";
const roots: string[] = [];
const handles: SearchIndex[] = [];
afterEach(async () => {
  for (const h of handles.splice(0)) h.close();
  for (const p of roots.splice(0))
    await rm(p, { recursive: true, force: true });
});
async function open(root?: string) {
  if (!root) {
    root = await mkdtemp(join(tmpdir(), "kairn-index-"));
    roots.push(root);
  }
  const index = await SearchIndex.open(root);
  handles.push(index);
  return { root, index };
}
const document: IndexDocument = {
  projectId: "project",
  documentId: "doc",
  sourceId: "source",
  path: "docs/architecture.md",
  title: "fallback",
  revision: "one",
  markdown:
    "# Architecture\n\n## Configuration\n\ncreateDocumentService node:sqlite npm run build --no-open\n\n```ts\ninterface API {}\n```",
};
it("persists FTS5 technical records, skips unchanged extraction and removes old sections transactionally", async () => {
  const { root, index } = await open();
  expect(index.put(document)).toBe(true);
  expect(index.put(document)).toBe(false);
  expect(
    index.database
      .prepare("SELECT fragment FROM sections WHERE sections MATCH ?")
      .all('"node" AND "sqlite"'),
  ).toEqual([expect.objectContaining({ fragment: "configuration" })]);
  if (process.platform !== "win32")
    expect((await stat(join(root, "search.sqlite"))).mode & 0o777).toBe(0o600);
  const other = await open(root);
  expect(
    other.index.database.prepare("SELECT count(*) n FROM documents").get()!.n,
  ).toBe(1);
  expect(
    index.put({
      ...document,
      revision: "two",
      markdown: "# New\n\nReplacement content",
    }),
  ).toBe(true);
  expect(
    other.index.database
      .prepare("SELECT count(*) n FROM sections WHERE sections MATCH ?")
      .get('"configuration"')!.n,
  ).toBe(0);
  index.prune("project", new Set());
  expect(
    other.index.database.prepare("SELECT count(*) n FROM sections").get()!.n,
  ).toBe(0);
});
it("rebuilds unsupported schemas and quarantines offline corrupt derived bytes", async () => {
  const { root, index } = await open();
  index.put(document);
  index.database.exec("PRAGMA user_version=999");
  handles.splice(handles.indexOf(index), 1);
  index.close();
  const rebuilt = (await open(root)).index;
  expect(
    rebuilt.database.prepare("SELECT count(*) n FROM documents").get()!.n,
  ).toBe(0);
  handles.splice(handles.indexOf(rebuilt), 1);
  rebuilt.close();
  await writeFile(join(root, "search.sqlite"), "not a sqlite database");
  const recovered = (await open(root)).index;
  expect(recovered.recovered).toBe(true);
  expect(recovered.put(document)).toBe(true);
  expect(
    (await readFile(join(root, "search.sqlite"))).subarray(0, 6).toString(),
  ).toBe("SQLite");
});
it("bounds lock waits, rolls back incomplete transactions, and prunes unregistered projects", async () => {
  const { root, index } = await open();
  const second = (await open(root)).index;
  index.put(document);
  index.database.exec("BEGIN IMMEDIATE; DELETE FROM documents;");
  expect(() => second.put({ ...document, revision: "changed" })).toThrow();
  index.database.exec("ROLLBACK");
  expect(
    second.database.prepare("SELECT count(*) n FROM documents").get()!.n,
  ).toBe(1);
  second.retainProjects(new Set());
  expect(
    second.database.prepare("SELECT count(*) n FROM documents").get()!.n,
  ).toBe(0);
});
it("measures a bounded real FTS5 dataset with weighted rank and plain snippets", async () => {
  const { index } = await open();
  const start = performance.now();
  for (let i = 0; i < 250; i++)
    index.put({
      ...document,
      documentId: String(i),
      markdown:
        document.markdown +
        "\n" +
        "Technical documentation paragraph ".repeat(30),
    });
  const indexed = performance.now();
  const result = index.database
    .prepare(
      "SELECT bm25(sections,0,0,0,0,0,0,0,0,10,6,4,2,1) score,snippet(sections,11,'','','…',16) excerpt FROM sections WHERE sections MATCH ? ORDER BY score LIMIT 20",
    )
    .all('"createdocumentservice"');
  console.log(
    JSON.stringify({
      datasetDocuments: 250,
      indexMs: Math.round(indexed - start),
      queryMs: Math.round(performance.now() - indexed),
      results: result.length,
      sqlite: index.database.prepare("SELECT sqlite_version() version").get(),
    }),
  );
  expect(result).toHaveLength(20);
});

it("bounds derived sections before replacing a valid document", async () => {
  const { index } = await open();
  index.put(document);
  expect(() =>
    index.put({
      ...document,
      revision: "huge",
      markdown: Array.from({ length: 513 }, (_, i) => `# Heading ${i}`).join(
        "\n",
      ),
    }),
  ).toThrow("section");
  expect(
    index.database.prepare("SELECT revision FROM documents").get()!.revision,
  ).toBe("one");
});
