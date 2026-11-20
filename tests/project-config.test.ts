import { mkdtemp, mkdir, writeFile, rm, cp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import {
  createProjectConfig,
  loadProjectConfig,
  resolveProjectConfig,
  discoverSourceCandidates,
} from "../src/core/config/project.js";
import { overridesSchema } from "../src/core/config/schema.js";
const roots: string[] = [];
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "kairn-project-"));
  roots.push(root);
  await mkdir(join(root, "docs"));
  await writeFile(join(root, "README.md"), "# Readme");
  return root;
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
const config = {
  schemaVersion: 1 as const,
  documentation: {
    sources: [{ path: "docs", primary: true }, { path: "README.md" }],
    exclude: ["**/AGENTS.md"],
  },
};
it("loads absent config and discovers candidates without registering all defaults", async () => {
  const root = await fixture();
  expect(await loadProjectConfig(root)).toBeNull();
  expect(await discoverSourceCandidates(root)).toHaveLength(2);
  expect(
    (await resolveProjectConfig(root, null)).sources.map((s) => s.path),
  ).toEqual(["docs"]);
});
it("creates only with approval, portable after copying and never overwrites", async () => {
  const root = await fixture();
  expect(await createProjectConfig(root, config, false)).toBe(false);
  expect(await loadProjectConfig(root)).toBeNull();
  await createProjectConfig(root, config, true);
  await expect(createProjectConfig(root, config, true)).rejects.toThrow(
    "changed",
  );
  const copy = await fixture();
  await cp(root, copy, { recursive: true });
  const resolved = await resolveProjectConfig(
    copy,
    await loadProjectConfig(copy),
  );
  expect(resolved.sources.map((s) => s.path)).toEqual(["docs", "README.md"]);
  expect(
    await readFile(join(copy, ".kairn", "config.json"), "utf8"),
  ).not.toContain(root);
});
it("resolves explicit array deltas, disabled sources and personal primary", async () => {
  const root = await fixture();
  const overrides = overridesSchema.parse({
    disabledSources: ["docs"],
    excludeRemove: ["**/AGENTS.md"],
    excludeAdd: ["**/drafts/**"],
    primary: "README.md",
  });
  const result = await resolveProjectConfig(root, config, overrides);
  expect(result.sources).toHaveLength(1);
  expect(result.sources[0]!.primary).toBe(true);
  expect(result.exclude).toEqual(["**/drafts/**"]);
  await expect(
    resolveProjectConfig(root, config, { ...overrides, primary: "missing" }),
  ).rejects.toThrow("primary");
});
it("keeps invalid/missing source configs intact", async () => {
  const root = await fixture();
  await createProjectConfig(root, config, true);
  await rm(join(root, "docs"), { recursive: true });
  await expect(
    resolveProjectConfig(root, await loadProjectConfig(root)),
  ).rejects.toThrow();
  expect((await loadProjectConfig(root))!.documentation.sources).toHaveLength(
    2,
  );
});

it("rejects shared configuration symlinks and duplicate source declarations", async () => {
  const root = await fixture();
  const outside = await fixture();
  const { symlink } = await import("node:fs/promises");
  await mkdir(join(outside, ".kairn"));
  await writeFile(
    join(outside, ".kairn", "config.json"),
    JSON.stringify(config),
  );
  await symlink(join(outside, ".kairn"), join(root, ".kairn"), "junction");
  await expect(loadProjectConfig(root)).rejects.toThrow("Symlink");
  await expect(
    resolveProjectConfig(outside, {
      ...config,
      documentation: {
        ...config.documentation,
        sources: [{ path: "docs" }, { path: "docs" }],
      },
    }),
  ).rejects.toThrow("Duplicate");
});
