import { expect, it } from "vitest";
import {
  extractSearchText,
  searchableText,
} from "../src/core/search-extraction.js";
import { analyzeMarkdown } from "../src/core/markdown.js";
it("extracts technical sections, lists, tables, code and repeated Unicode heading fragments", () => {
  const markdown =
    '# **Architecture**\n\nIntro\n\n## 日本語\n\n- createDocumentService\n- node:sqlite\n\n| Command | Path |\n| --- | --- |\n| npm run build --no-open | docs/architecture.md |\n\n```ts\ninterface Request { route: "GET /api/tree" }\n```\n\n## 日本語\n\nSecond\n';
  const data = extractSearchText(markdown, "fallback");
  expect(data.title).toBe("Architecture");
  expect(data.sections.map((s) => s.fragment)).toEqual(
    analyzeMarkdown(markdown).headings.map((h) => h.fragment),
  );
  expect(data.sections[1]!.body).toContain("createDocumentService");
  expect(data.sections[1]!.body).toContain("docs/architecture.md");
  expect(data.sections[1]!.code).toContain("GET /api/tree");
  expect(data.sections[2]!.fragment).toBe("日本語-1");
  expect(searchableText("createDocumentService")).toContain(
    "create document service",
  );
});
it("omits raw HTML blocks and image metadata, preserves fenced code as literal content", () => {
  const data = extractSearchText(
    "<script>secret()</script>\n\n<div>hidden words</div>\n\n![image metadata](https://example.com/image.png)\n\n```html\n<div>literal code</div>\n```",
    "Untitled",
  );
  expect(data.sections.map((s) => s.body).join(" ")).not.toMatch(
    /secret|hidden|metadata|https/,
  );
  expect(data.sections[0]!.code).toContain("literal code");
  expect(data.title).toBe("Untitled");
});
