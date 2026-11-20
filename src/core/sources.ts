import { isAbsolute, relative } from "node:path";
import type { ResolvedSource } from "./config/project.js";
import { ConfigError } from "./config/schema.js";

/** Compile limited source-relative glob syntax: slash-separated *, ?, and whole-segment **. No negation. */
export function compileExclusions(
  patterns: readonly string[],
): (path: string) => boolean {
  const rules = patterns.map((pattern) => {
    if (
      pattern.length > 256 ||
      /[\\[\]{}!\u0000-\u001f]/.test(pattern) ||
      pattern.startsWith("/") ||
      pattern.split("/").includes("..")
    )
      throw new ConfigError("INVALID", "Unsupported exclusion pattern.");
    const parts = pattern.split("/");
    const regex = parts
      .map((part, index) => {
        if (part === "**")
          return index === parts.length - 1 ? ".*" : "(?:[^/]+/)*";
        return (
          part
            .split("")
            .map((char) =>
              char === "*"
                ? "[^/]*"
                : char === "?"
                  ? "[^/]"
                  : char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            )
            .join("") + (index < parts.length - 1 ? "/" : "")
        );
      })
      .join("");
    return new RegExp("^" + regex + "$");
  });
  return (path) => rules.some((rule) => rule.test(path));
}
/** Report overlaps without dropping declarations; composition deduplicates canonical files primary-first. */
export function sourceOverlaps(
  sources: readonly ResolvedSource[],
): readonly { first: string; second: string }[] {
  const overlaps: { first: string; second: string }[] = [];
  for (let i = 0; i < sources.length; i++)
    for (let j = i + 1; j < sources.length; j++) {
      const a = sources[i]!;
      const b = sources[j]!;
      const inside = (parent: ResolvedSource, child: ResolvedSource) => {
        const path = relative(parent.absolutePath, child.absolutePath);
        return (
          parent.kind === "directory" &&
          !isAbsolute(path) &&
          path !== ".." &&
          !path.startsWith("../") &&
          !path.startsWith("..\\")
        );
      };
      if (a.absolutePath === b.absolutePath || inside(a, b) || inside(b, a))
        overlaps.push({ first: a.id, second: b.id });
    }
  return overlaps;
}
