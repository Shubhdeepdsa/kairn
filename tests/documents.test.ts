import {
  chmod,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, parse } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDocumentService } from "../src/core/documents.js";
import type { DocumentEntry, NavigationEntry } from "../src/core/documents.js";
const roots: string[] = [];
async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "kairn-docs-"));
  roots.push(root);
  return root;
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
function documents(tree: readonly NavigationEntry[]): DocumentEntry[] {
  return tree.flatMap((node) =>
    node.kind === "document" ? [node] : documents(node.children),
  );
}

describe("document service", () => {
  it("discovers nested Markdown deterministically, preserves identity and writes nothing", async () => {
    const root = await fixture();
    await mkdir(join(root, "guide"));
    await writeFile(join(root, "README.md"), "# Welcome");
    await writeFile(join(root, "guide", "hello.MARKDOWN"), "# Nested");
    await writeFile(join(root, "ignore.txt"), "not docs");
    await writeFile(join(root, ".secret.md"), "hidden");
    await mkdir(join(root, ".hidden"));
    await writeFile(join(root, ".hidden", "note.md"), "hidden");
    const service = await createDocumentService(root);
    expect(service.tree.map((n) => n.path)).toEqual(["guide", "README.md"]);
    const entries = documents(service.tree);
    expect(entries.map((n) => n.path)).toEqual([
      "guide/hello.MARKDOWN",
      "README.md",
    ]);
    const doc = await service.read(entries[0]!.id);
    expect(doc.canonicalPath).toBe(
      join(service.root, "guide", "hello.MARKDOWN"),
    );
    expect(doc.markdown).toBe("# Nested");
    expect(await createDocumentService(root)).toMatchObject({
      tree: service.tree,
    });
    expect(await readFile(join(root, "README.md"), "utf8")).toBe("# Welcome");
    expect(await readdir(join(root, "guide"))).toEqual(["hello.MARKDOWN"]);
    expect(Object.isFrozen(service.tree)).toBe(true);
  });
  it("supports empty roots and fresh edits without rescanning", async () => {
    const root = await fixture();
    expect((await createDocumentService(root)).tree).toEqual([]);
    await writeFile(join(root, "note.md"), "before");
    const service = await createDocumentService(root);
    const id = documents(service.tree)[0]!.id;
    await writeFile(join(root, "note.md"), "after");
    expect((await service.read(id)).markdown).toBe("after");
    await rm(join(root, "note.md"));
    await expect(service.read(id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("rejects unknown IDs, traversal, missing/invalid roots", async () => {
    const root = await fixture();
    const service = await createDocumentService(root);
    for (const id of [
      "../secret.md",
      "%2e%2e%2fsecret",
      "C:\\secret",
      "",
      "x".repeat(64),
    ])
      await expect(service.read(id)).rejects.toMatchObject({
        code: "INVALID_PATH",
      });
    await expect(service.read("a".repeat(64))).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      createDocumentService(join(root, "absent")),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await writeFile(join(root, "file.md"), "x");
    await expect(
      createDocumentService(join(root, "file.md")),
    ).rejects.toMatchObject({ code: "INVALID_PATH" });
    await expect(createDocumentService(parse(root).root)).rejects.toMatchObject(
      { code: "INVALID_PATH" },
    );
  });
  it("rejects selected-root and descendant symlinks", async () => {
    const root = await fixture();
    const outside = await fixture();
    await symlink(outside, join(root, "link"), "junction");
    await expect(
      createDocumentService(join(root, "link")),
    ).rejects.toMatchObject({ code: "INVALID_PATH" });
    await expect(createDocumentService(root)).rejects.toMatchObject({
      code: "INVALID_PATH",
    });
  });
  it("rejects symlink replacement of an indexed parent", async () => {
    const root = await fixture();
    const outside = await fixture();
    await mkdir(join(root, "guide"));
    await writeFile(join(root, "guide", "note.md"), "safe");
    await writeFile(join(outside, "note.md"), "secret");
    const service = await createDocumentService(root);
    const id = documents(service.tree)[0]!.id;
    await rm(join(root, "guide"), { recursive: true });
    await symlink(outside, join(root, "guide"), "junction");
    await expect(service.read(id)).rejects.toMatchObject({
      code: "INVALID_PATH",
    });
  });
  it("rejects replacement of the selected root identity", async () => {
    const root = await fixture();
    await writeFile(join(root, "note.md"), "safe");
    const service = await createDocumentService(root);
    const id = documents(service.tree)[0]!.id;
    // Keep the original inode alive so a newly created root cannot reuse it.
    const { rename } = await import("node:fs/promises");
    await rename(root, `${root}-old`);
    roots.push(`${root}-old`);
    await mkdir(root);
    await writeFile(join(root, "note.md"), "replacement");
    await expect(service.read(id)).rejects.toMatchObject({ code: "CHANGED" });
    await expect(service.refresh()).rejects.toMatchObject({ code: "CHANGED" });
  });
  it.skipIf(process.platform === "win32")(
    "rejects a file symlink added after discovery",
    async () => {
      const root = await fixture();
      const outside = await fixture();
      await writeFile(join(root, "note.md"), "safe");
      await writeFile(join(outside, "private.md"), "private");
      const service = await createDocumentService(root);
      const id = documents(service.tree)[0]!.id;
      await rm(join(root, "note.md"));
      await symlink(join(outside, "private.md"), join(root, "note.md"));
      await expect(service.read(id)).rejects.toMatchObject({
        code: "INVALID_PATH",
      });
    },
  );
  it("refreshes additions, nested paths, renames and removals without changing stable IDs", async () => {
    const root = await fixture();
    await writeFile(join(root, "old.md"), "old");
    const service = await createDocumentService(root);
    const oldId = documents(service.tree)[0]!.id;
    await mkdir(join(root, "guide"));
    await writeFile(join(root, "guide", "new.md"), "new");
    await writeFile(join(root, ".hidden.md"), "hidden");
    const first = service.refresh();
    const shared = service.refresh();
    expect(shared).toBe(first);
    const refreshed = documents(await first);
    expect(refreshed.map((entry) => entry.path)).toEqual([
      "guide/new.md",
      "old.md",
    ]);
    expect(refreshed.find((entry) => entry.path === "old.md")!.id).toBe(oldId);
    expect((await service.read(refreshed[0]!.id)).markdown).toBe("new");
    const { rename } = await import("node:fs/promises");
    await rename(
      join(root, "guide", "new.md"),
      join(root, "guide", "renamed.md"),
    );
    await rm(join(root, "old.md"));
    expect(
      documents(await service.refresh()).map((entry) => entry.path),
    ).toEqual(["guide/renamed.md"]);
    await expect(service.read(oldId)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
  it("retains the valid snapshot after a rejected rescan and recovers on the next one", async () => {
    const root = await fixture();
    await writeFile(join(root, "safe.md"), "safe");
    const service = await createDocumentService(root, { fileBytes: 4 });
    const before = service.tree;
    await writeFile(join(root, "large.md"), "too large");
    await expect(service.refresh()).rejects.toMatchObject({
      code: "LIMIT_EXCEEDED",
    });
    expect(service.tree).toBe(before);
    expect((await service.read(documents(before)[0]!.id)).markdown).toBe(
      "safe",
    );
    await rm(join(root, "large.md"));
    const outside = await fixture();
    await symlink(outside, join(root, "link"), "junction");
    await expect(service.refresh()).rejects.toMatchObject({
      code: "INVALID_PATH",
    });
    await rm(join(root, "link"), { recursive: true });
    await writeFile(join(root, "new.md"), "new");
    expect(documents(await service.refresh())).toHaveLength(2);
  });
  it("bounds file size during discovery and fresh reads", async () => {
    const root = await fixture();
    await writeFile(join(root, "note.md"), "1234");
    await expect(
      createDocumentService(root, { fileBytes: 3 }),
    ).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" });
    const service = await createDocumentService(root, { fileBytes: 4 });
    await writeFile(join(root, "note.md"), "12345");
    await expect(
      service.read(documents(service.tree)[0]!.id),
    ).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" });
  });
  it("bounds entries, document counts and depth", async () => {
    const root = await fixture();
    await writeFile(join(root, "a.md"), "a");
    await writeFile(join(root, "b.md"), "b");
    await expect(
      createDocumentService(root, { entries: 1 }),
    ).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" });
    await expect(
      createDocumentService(root, { documents: 1 }),
    ).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" });
    await mkdir(join(root, "a", "b"), { recursive: true });
    await expect(
      createDocumentService(root, { depth: 1 }),
    ).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" });
    await expect(
      createDocumentService(root, { entries: Infinity }),
    ).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" });
  });
  it.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
    "reports inaccessible roots and documents",
    async () => {
      const root = await fixture();
      await writeFile(join(root, "note.md"), "x");
      const service = await createDocumentService(root);
      const id = documents(service.tree)[0]!.id;
      await chmod(join(root, "note.md"), 0);
      try {
        await expect(service.read(id)).rejects.toMatchObject({
          code: "ACCESS_DENIED",
        });
      } finally {
        await chmod(join(root, "note.md"), 0o600);
      }
      await chmod(root, 0);
      try {
        await expect(createDocumentService(root)).rejects.toMatchObject({
          code: "ACCESS_DENIED",
        });
      } finally {
        await chmod(root, 0o700);
      }
    },
  );
});
