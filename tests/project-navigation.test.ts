import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { it, expect } from "vitest";
import { ProjectLibrary } from "../src/core/library.js";
import { createDocumentService } from "../src/core/documents.js";
import { ProjectNavigator } from "../src/core/project-navigation.js";
import { parseReaderLocation, readerHash } from "../src/viewer/navigation.js";
import { startDocumentationServer } from "../src/server/http.js";
import { SearchService } from "../src/core/search-service.js";
it("opens approved cross-project destinations, preserves legacy URLs, and rejects removed/invalid/excluded destinations", async () => {
  const root = await mkdtemp(join(tmpdir(), "kairn-navigation-"));
  const library = new ProjectLibrary(join(root, "data"));
  const search = new SearchService({ dataDirectory: join(root, "data") });
  try {
    const projects = [];
    for (const name of ["one", "two"]) {
      const p = join(root, name);
      await mkdir(join(p, "docs"), { recursive: true });
      await writeFile(
        join(p, "docs", "README.md"),
        "# Same title\n\n## Configuration\n\n" + name,
      );
      projects.push(await library.register(p, "Duplicate"));
    }
    const a = projects[0]!,
      b = projects[1]!;
    const initial = await createDocumentService(join(a.root, "docs"));
    const navigator = new ProjectNavigator(
      library,
      { id: a.id, name: a.name },
      initial,
    );
    const service = await navigator.documents(b.id);
    const node = service.tree[0]!;
    if (node.kind !== "document") throw new Error("Expected file");
    const destination = {
      projectId: b.id,
      documentId: node.id,
      fragment: "configuration",
    };
    expect((await navigator.open(destination)).content.markdown).toContain(
      "two",
    );
    expect(
      parseReaderLocation(readerHash(node.id, "configuration", b.id)),
    ).toEqual({ id: node.id, fragment: "configuration", projectId: b.id });
    expect(parseReaderLocation(readerHash(node.id))).toEqual({
      id: node.id,
      fragment: "",
    });
    const server = await startDocumentationServer(initial, {
      port: 0,
      application: { navigator, search },
    });
    try {
      const r = await fetch(
        server.url + `/api/projects/${b.id}/documents/${node.id}`,
      );
      expect(r.status).toBe(200);
      expect(JSON.stringify(await r.json())).not.toContain(root);
      expect(
        (await fetch(server.url + "/api/search?project=..%2Fprivate&query=x"))
          .status,
      ).toBe(400);
      expect(
        (await fetch(server.url + "/api/search?query=x&query=y")).status,
      ).toBe(400);
      expect((await fetch(server.url + "/api/tree?query=x")).status).toBe(400);
      expect((await fetch(server.url + "/api/projects")).status).toBe(200);
    } finally {
      await server.close();
    }
    await expect(
      navigator.open({ ...destination, fragment: "absent" }),
    ).rejects.toThrow("heading");
    await library.unregister(b.id);
    await expect(navigator.open(destination)).rejects.toThrow("unavailable");
    await expect(navigator.documents("../private")).rejects.toThrow(
      "identifier",
    );
  } finally {
    await search.close();
    await rm(root, { recursive: true, force: true });
  }
});
