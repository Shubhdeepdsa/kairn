import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { ProjectLibrary } from "../src/core/library.js";
const roots: string[] = [];
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "kairn-library-"));
  roots.push(root);
  await mkdir(join(root, "project"));
  return { root, project: join(root, "project"), data: join(root, "data") };
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
it("persists identity across service instances and rename; duplicate registration is idempotent", async () => {
  const f = await fixture();
  const library = new ProjectLibrary(f.data);
  expect(await library.list()).toEqual([]);
  const p = await library.register(f.project, "First");
  expect((await library.register(f.project, "Ignored")).id).toBe(p.id);
  const another = new ProjectLibrary(f.data);
  expect((await another.rename(p.id, "Renamed")).id).toBe(p.id);
  expect((await library.get(p.id)).name).toBe("Renamed");
  await expect(library.rename(p.id, "")).rejects.toThrow();
  expect(await library.list()).toHaveLength(1);
});
it("unregisters metadata only, keeps missing projects and validates stale overrides", async () => {
  const f = await fixture();
  await writeFile(join(f.project, "note.md"), "unchanged");
  const library = new ProjectLibrary(f.data);
  const p = await library.register(f.project);
  await library.setOverrides(
    p.id,
    { ...p.overrides, excludeAdd: ["**/AGENTS.md"] },
    p,
  );
  await expect(library.setOverrides(p.id, p.overrides, p)).rejects.toThrow(
    "changed",
  );
  await library.unregister(p.id);
  expect(await readFile(join(f.project, "note.md"), "utf8")).toBe("unchanged");
  expect(await library.list()).toEqual([]);
  const next = await library.register(f.project);
  await rm(f.project, { recursive: true });
  expect(await library.availability(next.id)).toBe("unavailable");
  expect(await library.list()).toHaveLength(1);
  await expect(library.get("unknown")).rejects.toThrow("not registered");
});
it("rejects files and invalid names without corrupting the Library", async () => {
  const f = await fixture();
  await writeFile(join(f.root, "file"), "x");
  const library = new ProjectLibrary(f.data);
  await expect(library.register(join(f.root, "file"))).rejects.toThrow();
  await expect(library.register(f.project, "")).rejects.toThrow();
  expect(await library.list()).toEqual([]);
});
