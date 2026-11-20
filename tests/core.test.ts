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
import {
  applyInitializationPlan,
  discoverDocumentationRoot,
  planInitialization,
} from "../src/core/initialization.js";

const roots: string[] = [];
async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "kairn-test-"));
  roots.push(root);
  return root;
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("safe initialization", () => {
  it("plans without writes and creates only after consent, without Git", async () => {
    const root = await fixture();
    expect(await discoverDocumentationRoot(root)).toBeNull();
    const plan = await planInitialization(root);
    expect(await readdir(root)).toEqual([]);
    expect((await applyInitializationPlan(plan, false)).outcome).toBe(
      "declined",
    );
    expect(await readdir(root)).toEqual([]);
    expect((await applyInitializationPlan(plan, true)).outcome).toBe("created");
    expect(await readdir(join(root, "docs"))).toEqual([]);
  });
  it("preserves existing bytes and repeats safely", async () => {
    const root = await fixture();
    await mkdir(join(root, "docs"));
    await writeFile(join(root, "docs", "README.md"), "untouched");
    for (let i = 0; i < 2; i++)
      expect(
        (await applyInitializationPlan(await planInitialization(root), true))
          .outcome,
      ).toBe("reused");
    expect(await readFile(join(root, "docs", "README.md"), "utf8")).toBe(
      "untouched",
    );
  });
  it("does not recursively discover nested docs", async () => {
    const root = await fixture();
    await mkdir(join(root, "nested", "docs"), { recursive: true });
    expect(await discoverDocumentationRoot(root)).toBeNull();
  });
  it("rejects file conflicts and missing roots", async () => {
    const root = await fixture();
    await writeFile(join(root, "docs"), "keep");
    await expect(planInitialization(root)).rejects.toThrow("docs must");
    await expect(planInitialization(join(root, "absent"))).rejects.toThrow();
    await expect(planInitialization(join(root, "docs"))).rejects.toThrow(
      "real directory",
    );
    await expect(planInitialization(parse(root).root)).rejects.toThrow(
      "filesystem root",
    );
  });
  it("rejects docs and selected-root symlinks", async () => {
    const root = await fixture();
    const outside = await fixture();
    await symlink(outside, join(root, "docs"), "junction");
    await expect(planInitialization(root)).rejects.toThrow("docs must");
    await expect(planInitialization(join(root, "docs"))).rejects.toThrow(
      "real directory",
    );
    expect(await readdir(outside)).toEqual([]);
  });
  it("rejects stale previews and forged root paths", async () => {
    const root = await fixture();
    const plan = await planInitialization(root);
    await mkdir(join(root, "docs"));
    await expect(applyInitializationPlan(plan, true)).rejects.toThrow(
      "changed",
    );
    await expect(
      applyInitializationPlan({ ...plan, root: join(root, "..") }, true),
    ).rejects.toThrow("changed");
  });
  it.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
    "rejects unreadable directories",
    async () => {
      const root = await fixture();
      await chmod(root, 0o000);
      try {
        await expect(planInitialization(root)).rejects.toThrow();
      } finally {
        await chmod(root, 0o700);
      }
    },
  );
});
