import { lstat, realpath } from "node:fs/promises";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import { createHash } from "node:crypto";
import { canonicalProjectRoot } from "../library.js";
import { assertRealPath, isMissing, readJson, updateJson } from "./storage.js";
import {
  ConfigError,
  overridesSchema,
  projectSchema,
  validateConfig,
} from "./schema.js";
import type { PersonalOverrides, SharedConfig } from "./schema.js";

/** Resolved machine path stays internal; public identity/provenance never contains absolute paths. */
export interface ResolvedSource {
  readonly id: string;
  readonly path: string;
  readonly absolutePath: string;
  readonly kind: "directory" | "file";
  readonly primary: boolean;
  readonly external: boolean;
  readonly label: string;
}
/** Effective configuration with explicit source/exclusion semantics, no writes. */
export interface ResolvedProject {
  readonly root: string;
  readonly name: string;
  readonly sources: readonly ResolvedSource[];
  readonly exclude: readonly string[];
}

/** Load an optional portable config; invalid/unsupported files are never replaced. */
export async function loadProjectConfig(
  root: string,
): Promise<SharedConfig | null> {
  const canonical = await canonicalProjectRoot(root);
  const file = join(canonical, ".kairn", "config.json");
  try {
    await assertRealPath(file);
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
  return readJson(file, projectSchema);
}
/** Explicit create-only write; false consent is a strict no-op. Existing config is never overwritten. */
export async function createProjectConfig(
  root: string,
  config: SharedConfig,
  approved: boolean,
): Promise<boolean> {
  if (!approved) return false;
  const canonical = await canonicalProjectRoot(root);
  const validated = validateConfig(projectSchema, config);
  await resolveProjectConfig(canonical, validated);
  const file = join(canonical, ".kairn", "config.json");
  await assertRealPath(file, true);
  await updateJson(file, projectSchema, () => validated, null);
  return true;
}
/** Discover only direct docs and root README candidates; does not register them. */
export async function discoverSourceCandidates(
  root: string,
): Promise<{ path: string; primary: boolean }[]> {
  const canonical = await canonicalProjectRoot(root);
  const candidates: { path: string; primary: boolean }[] = [];
  for (const path of ["docs", "README.md"]) {
    const full = join(canonical, path);
    try {
      const info = await lstat(full);
      if (info.isSymbolicLink())
        throw new ConfigError("INVALID", "Discovery candidate is a symlink.");
      if (
        (path === "docs" && info.isDirectory()) ||
        (path === "README.md" && info.isFile())
      )
        candidates.push({ path, primary: candidates.length === 0 });
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
  }
  return candidates;
}
/**
 * Resolve shared settings then personal additions/removals/primary and exclusion deltas.
 * Shared sources replace defaults; default is docs, then README only if docs is absent.
 * Personal disabledSources remove exact declared paths; canonical duplicates are deduplicated.
 * Missing paths fail actionably rather than being erased from persistent config.
 */
export async function resolveProjectConfig(
  root: string,
  shared: SharedConfig | null,
  personal: PersonalOverrides = overridesSchema.parse({}),
): Promise<ResolvedProject> {
  const canonical = await canonicalProjectRoot(root);
  const overrides = validateConfig(overridesSchema, personal);
  const config = shared === null ? null : validateConfig(projectSchema, shared);
  const defaults = config
    ? []
    : (await discoverSourceCandidates(canonical)).slice(0, 1);
  const declarations = [
    ...(config?.documentation.sources ?? defaults),
    ...overrides.additionalSources,
  ].filter((source) => !overrides.disabledSources.includes(source.path));
  if (declarations.length > 32)
    throw new ConfigError(
      "INVALID",
      "At most 32 effective sources are allowed.",
    );
  const sources: ResolvedSource[] = [];
  const seen = new Set<string>();
  for (const source of declarations) {
    const absolute = resolve(canonical, source.path);
    let info;
    try {
      await assertRealPath(absolute);
      info = await lstat(absolute);
    } catch {
      throw new ConfigError(
        "MISSING",
        `Documentation source is unavailable: ${source.path}. Fix the path or remove it from configuration.`,
      );
    }
    if (
      !info.isDirectory() &&
      !(info.isFile() && /\.(md|markdown)$/i.test(absolute))
    )
      throw new ConfigError(
        "INVALID",
        "Sources must be directories or Markdown files.",
      );
    const physical = await realpath(absolute);
    if (seen.has(physical)) continue;
    seen.add(physical);
    const projectPath = relative(canonical, physical).split("\\").join("/");
    const external =
      projectPath === ".." ||
      projectPath.startsWith("../") ||
      isAbsolute(projectPath);
    if (
      external &&
      !overrides.additionalSources.some(
        (item) => resolve(canonical, item.path) === physical,
      )
    )
      throw new ConfigError(
        "INVALID",
        "External sources must be personal additions.",
      );
    const identity = external ? physical : projectPath;
    sources.push({
      id: createHash("sha256").update(identity).digest("hex"),
      path: external ? `external-${sources.length + 1}` : projectPath,
      absolutePath: physical,
      kind: info.isDirectory() ? "directory" : "file",
      primary: source.primary ?? false,
      external,
      label: basename(physical),
    });
  }
  if (overrides.primary) {
    const primary = resolve(canonical, overrides.primary);
    if (!sources.some((s) => s.absolutePath === primary))
      throw new ConfigError(
        "INVALID",
        "Personal primary must identify an effective source.",
      );
    for (let i = 0; i < sources.length; i++)
      sources[i] = {
        ...sources[i]!,
        primary: sources[i]!.absolutePath === primary,
      };
  } else if (sources.filter((s) => s.primary).length > 1)
    throw new ConfigError(
      "INVALID",
      "Conflicting primary sources. Set a personal primary explicitly.",
    );
  if (sources.length && !sources.some((s) => s.primary))
    sources[0] = { ...sources[0]!, primary: true };
  const exclude = [
    ...new Set([
      ...(config?.documentation.exclude ?? []).filter(
        (pattern) => !overrides.excludeRemove.includes(pattern),
      ),
      ...overrides.excludeAdd,
    ]),
  ];
  return {
    root: canonical,
    name: config?.name ?? basename(canonical),
    sources,
    exclude,
  };
}
