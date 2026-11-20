import {
  mkdtemp,
  mkdir,
  writeFile,
  rm,
  rename,
  readFile,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, it } from "vitest";
import { ProjectLibrary } from "../src/core/library.js";
import { SearchCoordinator } from "../src/core/search-coordinator.js";
import { overridesSchema } from "../src/core/config/schema.js";
it("reconciles real Library sources, ignores, edits/deletions, unavailable roots and unregistration without rewriting documents", async () => {
  const root = await mkdtemp(join(tmpdir(), "kairn-coordinate-"));
  const data = join(root, "data");
  const library = new ProjectLibrary(data);
  const coordinator = new SearchCoordinator({
    dataDirectory: data,
    reconcileIntervalMs: 0,
  });
  try {
    const projects = [];
    for (const name of ["one", "two"]) {
      const p = join(root, name);
      await mkdir(join(p, "docs"), { recursive: true });
      await writeFile(
        join(p, "docs", "README.md"),
        "# Authentication\n\nOriginal searchablecontent",
      );
      projects.push(await library.register(p, "Duplicate"));
    }
    const request = {
      query: "searchablecontent",
      scope: { type: "global" as const },
      limit: 20,
    };
    let result = await coordinator.search(request);
    expect(result.results).toHaveLength(2);
    expect(result.coverage.every((p) => p.status === "ready")).toBe(true);
    expect(JSON.stringify(result)).not.toContain(root);
    const a = projects[0]!;
    const file = join(a.root, "docs", "README.md");
    await writeFile(file, "# Authentication\n\nReplacement freshtoken");
    expect((await coordinator.search(request)).results).toHaveLength(1);
    expect(
      (await coordinator.search({ ...request, query: "freshtoken" })).results,
    ).toHaveLength(1);
    await library.setOverrides(
      a.id,
      overridesSchema.parse({ excludeAdd: ["**/README.md"] }),
    );
    expect(
      (await coordinator.search({ ...request, query: "freshtoken" })).results,
    ).toHaveLength(0);
    await library.setOverrides(a.id, overridesSchema.parse({}));
    expect(
      (await coordinator.search({ ...request, query: "freshtoken" })).results,
    ).toHaveLength(1);
    await writeFile(join(a.root, "EXTRA.md"), "# Extra\n\nextrasource");
    await library.setOverrides(
      a.id,
      overridesSchema.parse({
        additionalSources: [{ path: "EXTRA.md" }],
        primary: "EXTRA.md",
      }),
    );
    expect(
      (await coordinator.search({ ...request, query: "extrasource" })).results,
    ).toHaveLength(1);
    await library.setOverrides(a.id, overridesSchema.parse({}));
    expect(
      (await coordinator.search({ ...request, query: "extrasource" })).results,
    ).toHaveLength(0);
    await rm(file);
    expect(
      (await coordinator.search({ ...request, query: "freshtoken" })).results,
    ).toHaveLength(0);
    const b = projects[1]!;
    await rename(b.root, b.root + "-absent");
    result = await coordinator.search(request);
    expect(result.results).toHaveLength(0);
    expect(result.coverage.find((p) => p.id === b.id)?.status).toBe(
      "unavailable",
    );
    expect(await library.list()).toHaveLength(2);
    await rename(b.root + "-absent", b.root);
    await library.unregister(b.id);
    expect((await coordinator.search(request)).coverage).toHaveLength(1);
    expect(await readFile(join(b.root, "docs", "README.md"), "utf8")).toContain(
      "Original searchablecontent",
    );
  } finally {
    await coordinator.close();
    await rm(root, { recursive: true, force: true });
  }
});
it("keeps transient active search separate from global registration and cleans its derived cache", async () => {
  const root = await mkdtemp(join(tmpdir(), "kairn-session-"));
  const data = join(root, "data");
  await mkdir(join(root, "docs"));
  await writeFile(join(root, "docs", "local.md"), "# Local\n\nprivatesession");
  const id = "session-" + "a".repeat(32);
  const coordinator = new SearchCoordinator({
    dataDirectory: data,
    session: {
      id,
      name: "Local",
      root,
      docsRoot: join(root, "docs"),
      configured: false,
    },
  });
  try {
    const request = {
      query: "privatesession",
      scope: { type: "project" as const, projectId: id },
      limit: 20,
    };
    const [a, b] = await Promise.all([
      coordinator.search(request),
      coordinator.search(request),
    ]);
    expect(a.results).toHaveLength(1);
    expect(b.results).toHaveLength(1);
    expect(
      (await coordinator.search({ ...request, scope: { type: "global" } }))
        .results,
    ).toHaveLength(0);
    expect(await new ProjectLibrary(data).list()).toHaveLength(0);
  } finally {
    await coordinator.close();
    await rm(root, { recursive: true, force: true });
  }
});
it("hosts SQLite and extraction off the reader thread with a bounded clean worker lifetime", async () => {
  const { SearchService } = (await import(
    new URL("../dist/core/search-service.js", import.meta.url).href
  )) as typeof import("../src/core/search-service.js");
  const root = await mkdtemp(join(tmpdir(), "kairn-worker-"));
  const service = new SearchService({ dataDirectory: root });
  try {
    const request = {
      query: "anything",
      scope: { type: "global" as const },
      limit: 20,
    };
    const one = service.search(request);
    expect(service.search(request)).toBe(one);
    expect(await one).toEqual({ results: [], coverage: [] });
  } finally {
    await service.close();
    await rm(root, { recursive: true, force: true });
  }
});

it("reports omitted oversized documents as partial with an accurate persisted count", async () => {
  const root = await mkdtemp(join(tmpdir(), "kairn-coverage-"));
  const data = join(root, "data");
  await mkdir(join(root, "docs"));
  await writeFile(
    join(root, "docs", "large.md"),
    Array.from({ length: 513 }, (_, i) => `# Heading ${i}`).join("\n"),
  );
  const library = new ProjectLibrary(data);
  const project = await library.register(root, "Large fixture");
  const coordinator = new SearchCoordinator({ dataDirectory: data });
  try {
    const response = await coordinator.search({
      query: "heading",
      scope: { type: "project", projectId: project.id },
      limit: 20,
    });
    expect(response.results).toEqual([]);
    expect(response.coverage).toEqual([
      expect.objectContaining({
        id: project.id,
        status: "partial",
        indexed: 0,
        total: 1,
      }),
    ]);
  } finally {
    await coordinator.close();
    await rm(root, { recursive: true, force: true });
  }
});

it("continues a forced global pass across bounded jobs without restarting completed projects", async () => {
  const root = await mkdtemp(join(tmpdir(), "kairn-resume-"));
  const data = join(root, "data");
  const library = new ProjectLibrary(data);
  const ids: string[] = [];
  for (const name of ["A", "B", "C"]) {
    const p = join(root, name);
    await mkdir(join(p, "docs"), { recursive: true });
    await writeFile(
      join(p, "docs", "README.md"),
      "# Authentication\n\nConfiguration",
    );
    ids.push((await library.register(p, name)).id);
  }
  const coordinator = new SearchCoordinator({
    dataDirectory: data,
    documentBudget: 1,
  });
  try {
    const request = {
      query: "authentication",
      scope: { type: "global" as const },
      limit: 20,
      refresh: true,
    };
    const first = await coordinator.search(request);
    expect(first.coverage.filter((p) => p.status === "ready")).toHaveLength(1);
    const second = await coordinator.search(request);
    expect(second.coverage.filter((p) => p.status === "ready")).toHaveLength(2);
    const third = await coordinator.search(request);
    expect(third.coverage.every((p) => p.status === "ready")).toBe(true);
    expect(new Set(third.results.map((r) => r.projectId))).toEqual(
      new Set(ids),
    );
  } finally {
    await coordinator.close();
    await rm(root, { recursive: true, force: true });
  }
});

it("fences cached results against a late writer using an obsolete ignore configuration", async () => {
  const { SearchIndex } = await import("../src/core/search-index.js");
  const root = await mkdtemp(join(tmpdir(), "kairn-approval-"));
  const data = join(root, "data");
  await mkdir(join(root, "docs"));
  await writeFile(
    join(root, "docs", "private.md"),
    "# Private\n\nobsoleteapprovaltoken",
  );
  await writeFile(join(root, "docs", "public.md"), "# Public");
  const library = new ProjectLibrary(data);
  const project = await library.register(root, "Project");
  const before = new SearchCoordinator({
    dataDirectory: data,
    reconcileIntervalMs: 60000,
  });
  const after = new SearchCoordinator({
    dataDirectory: data,
    reconcileIntervalMs: 60000,
  });
  let oldWriter: Awaited<ReturnType<typeof SearchIndex.open>> | undefined;
  try {
    const request = {
      query: "obsoleteapprovaltoken",
      scope: { type: "project" as const, projectId: project.id },
      limit: 20,
    };
    const oldResult = (await before.search(request)).results[0]!;
    oldWriter = await SearchIndex.open(join(data, "search"));
    const oldConfiguration = String(
      oldWriter.database
        .prepare(
          "SELECT configuration FROM documents WHERE project=? AND document=?",
        )
        .get(project.id, oldResult.documentId)!.configuration,
    );
    await library.setOverrides(
      project.id,
      overridesSchema.parse({ excludeAdd: ["**/private.md"] }),
    );
    expect((await after.search(request)).results).toEqual([]);
    // Model a cooperating writer that read approved bytes before the ignore changed,
    // but commits them after the newer coordinator has pruned the old row.
    oldWriter.put({
      projectId: project.id,
      documentId: oldResult.documentId,
      sourceId: "docs",
      path: "docs/private.md",
      title: "Private",
      revision: "late-old-read",
      configuration: oldConfiguration,
      markdown: "# Private\n\nobsoleteapprovaltoken",
    });
    expect((await after.search(request)).results).toEqual([]);
    const publicRow = oldWriter.database
      .prepare("SELECT * FROM documents WHERE project=? AND document<>?")
      .get(project.id, oldResult.documentId)!;
    const metadata = JSON.parse(String(publicRow.metadata)) as {
      sourceId: string;
      path: string;
      title: string;
    };
    oldWriter.put({
      projectId: project.id,
      documentId: String(publicRow.document),
      sourceId: metadata.sourceId,
      path: metadata.path,
      title: metadata.title,
      revision: String(publicRow.revision),
      configuration: oldConfiguration,
      markdown: "# Public",
    });
    expect(
      (await after.search({ ...request, query: "public" })).results,
    ).toHaveLength(1);
    expect((await before.search(request)).results).toEqual([]);
  } finally {
    oldWriter?.close();
    await before.close();
    await after.close();
    await rm(root, { recursive: true, force: true });
  }
});
