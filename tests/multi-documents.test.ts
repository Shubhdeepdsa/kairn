import { mkdtemp, mkdir, writeFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { createProjectDocumentService } from "../src/core/documents.js";
import type { NavigationEntry, DocumentEntry } from "../src/core/documents.js";
import { resolveProjectConfig } from "../src/core/config/project.js";
import { overridesSchema } from "../src/core/config/schema.js";
const roots: string[] = [];
async function fixture() {
  const path = await mkdtemp(join(tmpdir(), "kairn-multi-"));
  roots.push(path);
  const root = await realpath(path);
  await mkdir(join(root, "docs", "guide"), { recursive: true });
  await mkdir(join(root, ".github"));
  await writeFile(join(root, "docs", "overview.md"), "# Overview");
  await writeFile(join(root, "README.md"), "# Project");
  await writeFile(join(root, ".github", "DEPLOYMENT.md"), "# Deployment");
  return root;
}
function files(tree: readonly NavigationEntry[]): DocumentEntry[] {
  return tree.flatMap((n) => (n.kind === "document" ? [n] : files(n.children)));
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
it("composes directories and explicit hidden-folder files with provenance and canonical deduplication", async () => {
  const root = await fixture();
  await writeFile(join(root, "docs", "guide", "README.md"), "# Same title");
  const project = await resolveProjectConfig(root, {
    schemaVersion: 1,
    documentation: {
      sources: [
        { path: "docs", primary: true },
        { path: "README.md" },
        { path: ".github/DEPLOYMENT.md" },
        { path: "docs/guide" },
      ],
      exclude: [],
    },
  });
  const service = await createProjectDocumentService(project);
  expect(files(service.tree)).toHaveLength(4);
  expect(service.tree.some((n) => n.path === "docs")).toBe(false);
  for (const entry of files(service.tree)) {
    expect(entry.sourceId).toBeTruthy();
    expect((await service.read(entry.id)).markdown).toMatch(/^#/);
  }
  expect(JSON.stringify(service.tree)).not.toContain(root);
  const before = files(service.tree).find(
    (f) => f.projectPath === "docs/overview.md",
  )!;
  await writeFile(join(root, "docs", "new.md"), "# New");
  await service.refresh();
  expect(files(service.tree)).toHaveLength(5);
  expect(
    files(service.tree).find((f) => f.projectPath === before.projectPath)!.id,
  ).toBe(before.id);
  await rm(join(root, ".github", "DEPLOYMENT.md"));
  await service.refresh();
  expect(files(service.tree)).toHaveLength(4);
});
it("applies ignore deltas and explicitly approved external sources", async () => {
  const root = await fixture();
  const external = await fixture();
  await writeFile(join(root, "docs", "AGENTS.md"), "private instructions");
  await mkdir(join(root, "docs", "drafts"));
  await writeFile(join(root, "docs", "drafts", "note.md"), "draft");
  const shared = {
    schemaVersion: 1 as const,
    documentation: {
      sources: [{ path: "docs", primary: true }],
      exclude: ["**/AGENTS.md", "**/drafts/**"],
    },
  };
  let project = await resolveProjectConfig(
    root,
    shared,
    overridesSchema.parse({
      additionalSources: [{ path: join(external, "README.md") }],
    }),
  );
  let service = await createProjectDocumentService(project);
  expect(files(service.tree)).toHaveLength(2);
  expect(JSON.stringify(service.tree)).not.toContain(external);
  project = await resolveProjectConfig(
    root,
    shared,
    overridesSchema.parse({ excludeRemove: ["**/AGENTS.md"] }),
  );
  service = await createProjectDocumentService(project);
  expect(files(service.tree).map((f) => f.title)).toContain("AGENTS");
});
