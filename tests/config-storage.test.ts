import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import {
  applicationDataDirectory,
  readJson,
  updateJson,
} from "../src/core/config/storage.js";
import {
  librarySchema,
  projectSchema,
  validateConfig,
} from "../src/core/config/schema.js";
const roots: string[] = [];
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "kairn-storage-"));
  roots.push(root);
  return join(root, "library.json");
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
const empty = { schemaVersion: 1 as const, revision: 0, projects: [] };
it("validates strict fields, portable paths and versions", () => {
  expect(() => validateConfig(projectSchema, { schemaVersion: 2 })).toThrow(
    "schemaVersion",
  );
  for (const path of ["../secret", "C:\\private", "/private", "a/../../b"])
    expect(() =>
      validateConfig(projectSchema, {
        schemaVersion: 1,
        documentation: { sources: [{ path }] },
      }),
    ).toThrow();
  expect(() =>
    validateConfig(librarySchema, { ...empty, unexpected: true }),
  ).toThrow();
});
it("persists repeated updates, detects stale saves and serializes concurrent writers", async () => {
  const file = await fixture();
  expect(await readJson(file, librarySchema)).toBeNull();
  await updateJson(file, librarySchema, () => empty, null);
  await Promise.all(
    Array.from({ length: 5 }, () =>
      updateJson(file, librarySchema, (current) => ({
        ...current!,
        revision: current!.revision + 1,
      })),
    ),
  );
  expect((await readJson(file, librarySchema))!.revision).toBe(5);
  await expect(
    updateJson(file, librarySchema, () => empty, empty),
  ).rejects.toThrow("changed");
  expect(await readdir(roots[0]!)).toEqual(["library.json"]);
});
it("preserves corrupt files and rejects locked writes without temp leftovers", async () => {
  const file = await fixture();
  await writeFile(file, "broken");
  await expect(updateJson(file, librarySchema, () => empty)).rejects.toThrow(
    "Malformed",
  );
  expect(await readFile(file, "utf8")).toBe("broken");
  await writeFile(file, JSON.stringify({ ...empty, schemaVersion: 4 }));
  await expect(readJson(file, librarySchema)).rejects.toThrow("schemaVersion");
  await writeFile(file + ".lock", "");
  await expect(updateJson(file, librarySchema, () => empty)).rejects.toThrow(
    "locked",
  );
  expect(
    (await readdir(roots[0]!)).filter((name) => name.endsWith(".tmp")),
  ).toEqual([]);
});
it("cleans up after invalid mutation and does not change existing state", async () => {
  const file = await fixture();
  await updateJson(file, librarySchema, () => empty);
  await expect(
    updateJson(file, librarySchema, () => ({ ...empty, revision: -1 })),
  ).rejects.toThrow();
  expect(await readJson(file, librarySchema)).toEqual(empty);
  expect(await readdir(roots[0]!)).toEqual(["library.json"]);
});
it("uses isolated explicit app data and OS conventions", () => {
  expect(applicationDataDirectory({ KAIRN_DATA_DIR: tmpdir() })).toBe(tmpdir());
  expect(applicationDataDirectory({}, "darwin", "/home/example")).toContain(
    "Application Support",
  );
  expect(applicationDataDirectory({}, "win32", "/home/example")).toContain(
    "AppData",
  );
  expect(applicationDataDirectory({}, "linux", "/home/example")).toContain(
    ".local",
  );
  expect(() =>
    applicationDataDirectory({ KAIRN_DATA_DIR: "relative" }),
  ).toThrow("absolute");
});

it("detects a real competing process holding the exclusive writer lock", async () => {
  const { spawn } = await import("node:child_process");
  const { once } = await import("node:events");
  const file = await fixture();
  await updateJson(file, librarySchema, () => empty);
  const child = spawn(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import {open} from 'node:fs/promises'; const handle=await open(process.argv[1],'wx'); console.log('locked'); process.stdin.resume(); process.stdin.on('end',async()=>{await handle.close();});`,
      file + ".lock",
    ],
    { stdio: ["pipe", "pipe", "pipe"] },
  );
  try {
    await new Promise<void>((resolve, reject) => {
      child.stdout.once("data", () => resolve());
      child.once("error", reject);
      child.once("exit", () => reject(new Error("writer exited early")));
    });
    await expect(
      updateJson(file, librarySchema, () => ({ ...empty, revision: 1 })),
    ).rejects.toThrow("locked");
    expect(await readJson(file, librarySchema)).toEqual(empty);
  } finally {
    const exited = once(child, "exit");
    child.stdin.end();
    await exited;
  }
});
