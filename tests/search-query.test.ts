import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { SearchIndex } from "../src/core/search-index.js";
import { querySearchIndex, searchTerms } from "../src/core/search-query.js";
const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";
it("ranks exact title over heading, path, body repetition and code; groups sections and isolates scopes", async () => {
  const root = await mkdtemp(join(tmpdir(), "kairn-query-"));
  const index = await SearchIndex.open(root);
  try {
    const corpus = [
      ["title", "# Authentication\n\nIntro"],
      ["heading", "# Design\n\n## Authentication\n\nDetails"],
      ["path", "# Reference\n\nOther words"],
      ["body", "# Manual\n\n" + "authentication ".repeat(1000)],
      ["code", "# API\n\n```ts\nconst authentication = true;\n```"],
    ];
    for (const [id, markdown] of corpus)
      index.put({
        projectId: a,
        documentId: id!,
        sourceId: "docs",
        path: id === "path" ? "docs/Authentication Guide.md" : `docs/${id}.md`,
        title: id!,
        revision: "1",
        markdown: markdown!,
      });
    index.put({
      projectId: b,
      documentId: "title",
      sourceId: "docs",
      path: "docs/title.md",
      title: "title",
      revision: "1",
      markdown:
        "# Authentication\n\n## Configuration\n\ncreateDocumentService node:sqlite --no-open GET /api/tree docs/architecture.md\n\n## Configuration\n\nconfiguration resolver",
    });
    const request = {
      query: "authentication",
      scope: { type: "project" as const, projectId: a },
      limit: 20,
    };
    const projects = [
      { id: a, name: "Duplicate" },
      { id: b, name: "Duplicate" },
    ];
    const results = querySearchIndex(index, request, projects);
    expect(results.map((r) => r.documentId)).toEqual([
      "title",
      "heading",
      "path",
      "body",
      "code",
    ]);
    expect(results[2]!.sourcePath).toBe("docs/Authentication Guide.md");
    expect(
      results.every((r) => r.projectId === a && r.snippet.length <= 232),
    ).toBe(true);
    const global = querySearchIndex(
      index,
      { ...request, scope: { type: "global" } },
      projects,
    );
    expect(global.filter((r) => r.documentId === "title")).toHaveLength(2);
    for (const query of [
      "createDocumentService",
      "document service",
      "node:sqlite",
      "--no-open",
      "GET /api/tree",
      "docs/architecture.md",
      "configuration resolver",
    ]) {
      const r = querySearchIndex(
        index,
        { ...request, query, scope: { type: "project", projectId: b } },
        projects,
      );
      expect(r, query).toHaveLength(1);
      expect(r[0]!.fragment).toMatch(/^configuration/);
    }
    expect(
      querySearchIndex(index, { ...request, query: "   " }, projects),
    ).toEqual([]);
    for (const query of [
      '" OR * NOT NEAR(',
      "'; DROP TABLE sections; --",
      "(((((",
      "foo:bar",
    ])
      expect(() =>
        querySearchIndex(index, { ...request, query }, projects),
      ).not.toThrow();
    expect(() => searchTerms({ ...request, query: "a".repeat(257) })).toThrow();
    expect(() => searchTerms({ ...request, limit: 1000 })).toThrow();
    expect(() =>
      searchTerms({
        ...request,
        scope: { type: "project", projectId: "../private" },
      }),
    ).toThrow();
  } finally {
    index.close();
    await rm(root, { recursive: true, force: true });
  }
});

it("returns bounded relevant context near the end of a large Unicode section", async () => {
  const root = await mkdtemp(join(tmpdir(), "kairn-query-large-"));
  const index = await SearchIndex.open(root);
  try {
    index.put({
      projectId: a,
      documentId: "large",
      sourceId: "docs",
      path: "docs/日本語.md",
      title: "Large",
      revision: "1",
      markdown:
        "# Large\n\n## 日本語\n\n" +
        "ordinary text ".repeat(35000) +
        "\nuniquematchingtoken 日本語説明",
    });
    const results = querySearchIndex(
      index,
      {
        query: "uniquematchingtoken",
        scope: { type: "project", projectId: a },
        limit: 20,
      },
      [{ id: a, name: "日本語" }],
    );
    expect(results).toHaveLength(1);
    expect(results[0]!.snippet).toContain("uniquematchingtoken");
    expect(results[0]!.snippet.length).toBeLessThanOrEqual(232);
    expect(results[0]!.fragment).toBe("日本語");
    expect(
      querySearchIndex(
        index,
        {
          query: "日本語説明",
          scope: { type: "project", projectId: a },
          limit: 20,
        },
        [{ id: a, name: "日本語" }],
      ),
    ).toHaveLength(1);
  } finally {
    index.close();
    await rm(root, { recursive: true, force: true });
  }
});
