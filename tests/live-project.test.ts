import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, it } from "vitest";
import { ProjectLibrary } from "../src/core/library.js";
import { resolveRunProject } from "../src/core/application.js";
import {
  loadProjectConfig,
  resolveProjectConfig,
} from "../src/core/config/project.js";
import { createProjectDocumentService } from "../src/core/documents.js";
import { createReloadingDocumentService } from "../src/core/live-project.js";
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "kairn-live-"));
  roots.push(root);
  await mkdir(join(root, "docs"));
  await writeFile(join(root, "docs", "AGENTS.md"), "# Agents");
  await writeFile(join(root, "docs", "note.md"), "# Note");
  await writeFile(join(root, "README.md"), "# Readme");
  return root;
}
it("atomically reloads personal sources, exclusions, primary and shared config with recovery", async () => {
  const root = await fixture();
  const library = new ProjectLibrary(join(root, "data"));
  const project = await library.register(root);
  const initial = (await resolveRunProject(root, project.id, library))!;
  const service = await createReloadingDocumentService(
    await createProjectDocumentService(initial),
    root,
    initial,
    async () =>
      resolveProjectConfig(
        root,
        await loadProjectConfig(root),
        (await library.get(project.id)).overrides,
      ),
  );
  expect(JSON.stringify(service.tree)).toContain("AGENTS");
  await library.setOverrides(project.id, {
    ...project.overrides,
    additionalSources: [{ path: "README.md" }],
    excludeAdd: ["**/AGENTS.md"],
    primary: "README.md",
  });
  const a = service.refresh();
  expect(service.refresh()).toBe(a);
  await a;
  expect(JSON.stringify(service.tree)).not.toContain("AGENTS");
  expect(JSON.stringify(service.tree)).toContain("README");
  expect(service.tree[0]?.kind).toBe("document");
  await mkdir(join(root, ".kairn"));
  await writeFile(join(root, ".kairn", "config.json"), "bad");
  const before = service.tree;
  await service.refresh();
  expect(service.tree).toBe(before);
  expect(service.warning).toContain("last valid");
  await writeFile(
    join(root, ".kairn", "config.json"),
    JSON.stringify({
      schemaVersion: 1,
      documentation: { sources: [{ path: "missing" }] },
    }),
  );
  await service.refresh();
  expect(service.tree).toBe(before);
  await rm(join(root, ".kairn", "config.json"));
  await library.setOverrides(project.id, project.overrides);
  await service.refresh();
  expect(service.warning).toBeUndefined();
  expect(JSON.stringify(service.tree)).toContain("AGENTS");
  await library.unregister(project.id);
  const final = service.tree;
  await service.refresh();
  expect(service.tree).toBe(final);
  expect(service.warning).toContain("registration");
});

it("removes a deleted individual source from navigation while preserving its configuration for repair", async () => {
  const root = await fixture();
  const library = new ProjectLibrary(join(root, "data"));
  const project = await library.register(root);
  await library.setOverrides(project.id, {
    ...project.overrides,
    additionalSources: [{ path: "README.md" }],
  });
  const load = async () =>
    resolveProjectConfig(
      root,
      await loadProjectConfig(root),
      (await library.get(project.id)).overrides,
    );
  const initial = await load();
  const service = await createReloadingDocumentService(
    await createProjectDocumentService(initial),
    root,
    initial,
    load,
  );
  expect(JSON.stringify(service.tree)).toContain("README");
  await rm(join(root, "README.md"));
  await service.refresh();
  expect(JSON.stringify(service.tree)).not.toContain("README");
  expect(service.warning).toContain("last valid");
  expect(
    (await library.get(project.id)).overrides.additionalSources,
  ).toHaveLength(1);
  await writeFile(join(root, "README.md"), "# Restored");
  await service.refresh();
  expect(JSON.stringify(service.tree)).toContain("README");
  expect(service.warning).toBeUndefined();
});
