import { mkdtemp, mkdir, writeFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { resolveProjectConfig } from "../src/core/config/project.js";
import { createProjectDocumentService } from "../src/core/documents.js";
import type { NavigationEntry, DocumentEntry } from "../src/core/documents.js";
import { resolveDocumentLink } from "../src/core/document-links.js";
import { analyzeMarkdown } from "../src/core/markdown.js";
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
function files(nodes: readonly NavigationEntry[]): DocumentEntry[] {
  return nodes.flatMap((n) =>
    n.kind === "document" ? [n] : files(n.children),
  );
}
async function fixture() {
  const input = await mkdtemp(join(tmpdir(), "kairn-links-"));
  roots.push(input);
  const root = await realpath(input);
  await mkdir(join(root, "docs"));
  await mkdir(join(root, ".github"));
  await writeFile(join(root, "README.md"), "# Root");
  await writeFile(join(root, "docs", "overview.md"), "# Start");
  await writeFile(
    join(root, "docs", "é space.markdown"),
    "# Runtime model\n\n# Runtime model\n\n# 日本語!",
  );
  await writeFile(join(root, ".github", "DEPLOYMENT.md"), "# Deploy");
  const service = await createProjectDocumentService(
    await resolveProjectConfig(root, {
      schemaVersion: 1,
      documentation: {
        sources: [
          { path: "docs", primary: true },
          { path: "README.md" },
          { path: ".github/DEPLOYMENT.md" },
        ],
        exclude: ["**/AGENTS.md"],
      },
    }),
  );
  return { root, service, docs: files(service.tree) };
}
it("resolves physical relative links across sources, encoded/Unicode names and headings", async () => {
  const { service, docs } = await fixture();
  const id = docs.find((d) => d.projectPath === "docs/overview.md")!.id;
  for (const target of [
    "é%20space.markdown#runtime-model",
    "%C3%A9%20space.markdown#runtime-model-1",
    "é%20space.markdown#日本語",
    "../README.md#root",
    "../.github/DEPLOYMENT.md#deploy",
    "#start",
  ])
    expect((await resolveDocumentLink(service, id, target)).kind, target).toBe(
      "document",
    );
  const headings = analyzeMarkdown("# Repeat\n# Repeat\n# 日本語!").headings;
  expect(headings.map((h) => h.fragment)).toEqual([
    "repeat",
    "repeat-1",
    "日本語",
  ]);
});
it("diagnoses excluded, missing, unregistered, malformed and unsafe links without disclosing paths", async () => {
  const { root, service, docs } = await fixture();
  const id = docs[0]!.id;
  for (const [target, code] of [
    ["AGENTS.md", "EXCLUDED"],
    ["missing.md", "MISSING"],
    ["../private.md", "UNREGISTERED"],
    ["../../../../etc/passwd", "UNREGISTERED"],
    ["%zz", "INVALID"],
    ["javascript:alert(1)", "INVALID"],
    ["file:///etc/passwd", "INVALID"],
    ["/etc/passwd", "INVALID"],
    ["..\\private.md", "INVALID"],
    ["../README.md#absent", "MISSING_FRAGMENT"],
  ] as const) {
    const result = await resolveDocumentLink(service, id, target);
    expect(result.kind).toBe("diagnostic");
    if (result.kind === "diagnostic")
      expect(result.diagnostic.code, target).toBe(code);
    expect(JSON.stringify(result)).not.toContain(root);
  }
  for (const target of ["https://example.com", "mailto:hello@example.com"])
    expect((await resolveDocumentLink(service, id, target)).kind).toBe(
      "external",
    );
});

it("bounds and deduplicates current-document diagnostics without checking remote URLs", async () => {
  const { diagnoseDocumentLinks } =
    await import("../src/core/link-diagnostics.js");
  const { service, docs } = await fixture();
  const id = docs[0]!.id;
  const diagnostics = await diagnoseDocumentLinks(
    service,
    id,
    "[Missing](missing.md) [Again](missing.md) [Web](https://example.com)",
  );
  expect(diagnostics).toHaveLength(1);
  expect(diagnostics[0]?.code).toBe("MISSING");
  const many = Array.from(
    { length: 40 },
    (_, index) => `[${index}](absent-${index}.md)`,
  ).join("\n");
  const bounded = await diagnoseDocumentLinks(service, id, many);
  expect(bounded).toHaveLength(33);
  expect(bounded[32]?.code).toBe("LIMIT_EXCEEDED");
});
