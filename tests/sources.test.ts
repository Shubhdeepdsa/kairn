import { expect, it } from "vitest";
import { compileExclusions, sourceOverlaps } from "../src/core/sources.js";
import { resolve } from "node:path";
it("matches limited source-relative globs consistently", () => {
  const excluded = compileExclusions([
    "**/AGENTS.md",
    "**/drafts/**",
    "generated/**",
    "one?.md",
  ]);
  for (const path of [
    "AGENTS.md",
    "nested/AGENTS.md",
    "drafts/a.md",
    "a/drafts/b.md",
    "generated/file.md",
    "one1.md",
  ])
    expect(excluded(path), path).toBe(true);
  for (const path of [
    "agents.md",
    "a/generated/file.md",
    "one12.md",
    "draft.md",
  ])
    expect(excluded(path), path).toBe(false);
  for (const pattern of ["!foo", "../private", "[abc]", "a\\b"])
    expect(() => compileExclusions([pattern])).toThrow();
});
it("reports nested overlaps while retaining source identifiers", () => {
  const source = (id: string, path: string) => ({
    id,
    path,
    absolutePath: resolve(path),
    kind: "directory" as const,
    primary: false,
    external: false,
    label: path,
  });
  expect(
    sourceOverlaps([
      source("a", "docs"),
      source("b", "docs/guide"),
      source("c", "other"),
    ]),
  ).toEqual([{ first: "a", second: "b" }]);
  if (process.platform === "win32") {
    expect(
      sourceOverlaps([
        { ...source("c", "docs"), absolutePath: "C:\\docs" },
        { ...source("d", "docs"), absolutePath: "D:\\docs" },
      ]),
    ).toEqual([]);
  }
});
