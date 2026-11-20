import { randomUUID } from "node:crypto";
import { lstat, realpath } from "node:fs/promises";
import { basename, join, parse, resolve } from "node:path";
import {
  ConfigError,
  librarySchema,
  overridesSchema,
  validateConfig,
} from "./config/schema.js";
import type {
  LibraryData,
  PersonalOverrides,
  Project,
} from "./config/schema.js";
import {
  applicationDataDirectory,
  assertRealPath,
  readJson,
  updateJson,
} from "./config/storage.js";

/** Canonical project identity; direct symlinks/files/filesystem roots are invalid. */
export async function canonicalProjectRoot(input: string): Promise<string> {
  const path = resolve(input);
  const info = await lstat(path);
  if (!info.isDirectory() || info.isSymbolicLink() || path === parse(path).root)
    throw new ConfigError(
      "INVALID",
      "Select an existing project directory, not a symlink, file or filesystem root.",
    );
  const root = await realpath(path);
  await assertRealPath(root);
  return root;
}
/** Persistent Library with explicit storage ownership; never modifies registered projects. */
export class ProjectLibrary {
  readonly file: string;
  constructor(dataDirectory: string = applicationDataDirectory()) {
    this.file = join(dataDirectory, "library.json");
  }
  async snapshot(): Promise<LibraryData> {
    return (
      (await readJson(this.file, librarySchema)) ?? {
        schemaVersion: 1,
        revision: 0,
        projects: [],
      }
    );
  }
  async list(): Promise<Project[]> {
    return (await this.snapshot()).projects;
  }
  async get(id: string): Promise<Project> {
    const project = (await this.list()).find((p) => p.id === id);
    if (!project)
      throw new ConfigError(
        "MISSING",
        "Project ID not registered. Use kairn project list.",
      );
    return project;
  }
  async find(root: string): Promise<Project | undefined> {
    const canonical = await canonicalProjectRoot(root);
    return (await this.list()).find((p) => p.root === canonical);
  }
  /** Idempotent for the same canonical root; display names never determine identity. */
  async register(root: string, name?: string): Promise<Project> {
    const canonical = await canonicalProjectRoot(root);
    const before = await this.snapshot();
    const existing = before.projects.find((p) => p.root === canonical);
    if (existing) return existing;
    const project: Project = {
      id: randomUUID(),
      name: name ?? basename(canonical),
      root: canonical,
      overrides: overridesSchema.parse({}),
    };
    await this.change(before, (data) => {
      data.projects.push(project);
    });
    return project;
  }
  async rename(id: string, name: string, expected?: Project): Promise<Project> {
    const before = await this.snapshot();
    const project = before.projects.find((p) => p.id === id);
    if (!project)
      throw new ConfigError("MISSING", "Project ID not registered.");
    if (expected && JSON.stringify(expected) !== JSON.stringify(project))
      throw new ConfigError("CONFLICT", "Project changed since preview.");
    await this.change(before, (data) => {
      data.projects.find((p) => p.id === id)!.name = name;
    });
    return this.get(id);
  }
  /** Removes only registration metadata; source and shared config bytes are untouched. */
  async unregister(id: string, expected?: Project): Promise<void> {
    const before = await this.snapshot();
    if (!before.projects.some((p) => p.id === id))
      throw new ConfigError("MISSING", "Project ID not registered.");
    if (
      expected &&
      JSON.stringify(expected) !==
        JSON.stringify(before.projects.find((p) => p.id === id))
    )
      throw new ConfigError("CONFLICT", "Project changed since preview.");
    await this.change(before, (data) => {
      data.projects = data.projects.filter((p) => p.id !== id);
    });
  }
  /** Replace the small typed override record after an explicit application-level preview. */
  async setOverrides(
    id: string,
    overrides: PersonalOverrides,
    expected?: Project,
  ): Promise<Project> {
    const before = await this.snapshot();
    const project = before.projects.find((p) => p.id === id);
    if (!project)
      throw new ConfigError("MISSING", "Project ID not registered.");
    if (expected && JSON.stringify(expected) !== JSON.stringify(project))
      throw new ConfigError("CONFLICT", "Project changed since preview.");
    const validated = validateConfig(overridesSchema, overrides);
    await this.change(before, (data) => {
      data.projects.find((p) => p.id === id)!.overrides = validated;
    });
    return this.get(id);
  }
  /** Missing roots are reported rather than removed from persisted data. */
  async availability(id: string): Promise<"available" | "unavailable"> {
    const project = await this.get(id);
    try {
      return (await canonicalProjectRoot(project.root)) === project.root
        ? "available"
        : "unavailable";
    } catch {
      return "unavailable";
    }
  }
  private async change(
    before: LibraryData,
    mutate: (data: LibraryData) => void,
  ): Promise<void> {
    const disk = await readJson(this.file, librarySchema);
    if (disk && JSON.stringify(disk) !== JSON.stringify(before))
      throw new ConfigError("CONFLICT", "Library changed; reload and retry.");
    await updateJson(
      this.file,
      librarySchema,
      () => {
        const next = structuredClone(before);
        mutate(next);
        next.revision++;
        return next;
      },
      disk,
    );
  }
}
