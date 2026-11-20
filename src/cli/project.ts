import { parseArgs } from "node:util";
import { relative, resolve } from "node:path";
import { confirm, isCancel, text } from "@clack/prompts";
import { ProjectLibrary } from "../core/library.js";
import {
  createProjectConfig,
  discoverSourceCandidates,
  loadProjectConfig,
  resolveProjectConfig,
} from "../core/config/project.js";
import { sourceOverlaps } from "../core/sources.js";
import { ConfigError } from "../core/config/schema.js";
import type { PersonalOverrides } from "../core/config/schema.js";

/** Injectable terminal boundary for project metadata operations. */
export interface ProjectPrompts {
  value(message: string): Promise<string | null>;
  approve(message: string): Promise<boolean>;
}
/** Default Clack adapter; cancellation never reaches persistence. */
export const projectPrompts: ProjectPrompts = {
  async value(message) {
    const result = await text({ message });
    return isCancel(result) ? null : result;
  },
  async approve(message) {
    const result = await confirm({ message, initialValue: false });
    return !isCancel(result) && result;
  },
};
/**
 * Parse the single project command grammar. All mutations preview and require --yes
 * or interactive consent. Listing/showing never creates storage. Core owns all writes.
 */
export async function runProjectCommand(
  args: string[],
  library: ProjectLibrary,
  interactive: boolean,
  prompts: ProjectPrompts = projectPrompts,
  message: (text: string) => void = console.log,
): Promise<number> {
  const { values, positionals: p } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      yes: { type: "boolean" },
      cwd: { type: "string" },
      name: { type: "string" },
      path: { type: "string" },
      pattern: { type: "string" },
    },
  });
  const group = p[0];
  const nested = ["sources", "ignore", "config"].includes(group ?? "");
  const action = nested ? p[1] : group;
  let id = nested ? p[2] : p[1];
  const allowed =
    group === "sources"
      ? ["list", "discover", "add", "remove", "primary"]
      : group === "ignore"
        ? ["add", "remove", "restore"]
        : group === "config"
          ? ["init"]
          : ["add", "list", "show", "rename", "remove"];
  if (!action || !allowed.includes(action) || p.length > (nested ? 3 : 2))
    throw new ConfigError(
      "INVALID",
      "Unknown project command. Use kairn --help.",
    );
  async function input(
    value: string | undefined,
    prompt: string,
  ): Promise<string | null> {
    if (value !== undefined) return value;
    if (!interactive)
      throw new ConfigError(
        "INVALID",
        `${prompt} is required in noninteractive mode.`,
      );
    return prompts.value(prompt);
  }
  async function approve(preview: string): Promise<boolean> {
    message(preview);
    if (values.yes) return true;
    if (!interactive)
      throw new ConfigError(
        "INVALID",
        "Use --yes to approve the preview without a terminal.",
      );
    return prompts.approve("Apply this change?");
  }
  if (group === "list") {
    if (id) throw new ConfigError("INVALID", "project list takes no ID.");
    const projects = await library.list();
    const output = await Promise.all(
      projects.map(async (project) => ({
        ...project,
        availability: await library.availability(project.id),
      })),
    );
    message(JSON.stringify(output, null, 2));
    return 0;
  }
  if (group === "add") {
    if (id)
      throw new ConfigError("INVALID", "Use --cwd for the project directory.");
    const root = values.cwd ?? process.cwd();
    const candidates = await discoverSourceCandidates(root);
    if (
      !(await approve(
        `Register project ${resolve(root)}\nDiscovery candidates (not automatically saved): ${candidates.map((c) => c.path).join(", ") || "none"}\nDefault viewing uses docs/, then README.md.`,
      ))
    )
      return 2;
    const project = await library.register(root, values.name);
    message(JSON.stringify(project, null, 2));
    return 0;
  }
  const selected = await input(id, "Project ID");
  if (!selected) return 2;
  id = selected;
  const project = await library.get(id);
  if (group === "show") {
    const effective = await resolveProjectConfig(
      project.root,
      await loadProjectConfig(project.root),
      project.overrides,
    );
    message(
      JSON.stringify(
        { project, effective, overlaps: sourceOverlaps(effective!.sources) },
        null,
        2,
      ),
    );
    return 0;
  }
  if (group === "rename") {
    const name = await input(values.name, "Project display name");
    if (name === null) return 2;
    if (!(await approve(`Rename ${project.name} to ${name}; ID stays ${id}.`)))
      return 2;
    message(JSON.stringify(await library.rename(id, name, project)));
    return 0;
  }
  if (group === "remove") {
    if (
      !(await approve(
        `Remove ${project.name} (${id}) from Library only. Source files and project config will remain untouched.`,
      ))
    )
      return 2;
    await library.unregister(id, project);
    message("Project unregistered. Source files preserved.");
    return 0;
  }
  const shared = await loadProjectConfig(project.root);
  if (group === "sources" && action === "discover") {
    message(
      JSON.stringify(await discoverSourceCandidates(project.root), null, 2),
    );
    return 0;
  }
  const effective =
    group === "config" || (group === "sources" && action === "list")
      ? await resolveProjectConfig(project.root, shared, project.overrides)
      : null;
  if (group === "sources" && action === "list") {
    message(
      JSON.stringify(
        {
          sources: effective!.sources,
          overlaps: sourceOverlaps(effective!.sources),
        },
        null,
        2,
      ),
    );
    return 0;
  }
  if (group === "config") {
    const config = {
      schemaVersion: 1 as const,
      name: project.name,
      documentation: {
        sources: effective!.sources.map((source) => {
          if (source.external)
            throw new ConfigError(
              "INVALID",
              "External sources cannot be written into shared config.",
            );
          return { path: source.path, primary: source.primary };
        }),
        exclude: [...effective!.exclude],
      },
    };
    if (
      !(await approve(
        `Create .kairn/config.json (never overwrite):\n${JSON.stringify(config, null, 2)}`,
      ))
    )
      return 2;
    await createProjectConfig(project.root, config, true);
    message("Created portable .kairn/config.json.");
    return 0;
  }
  const overrides: PersonalOverrides = structuredClone(project.overrides);
  if (group === "sources") {
    const path = await input(values.path, "Documentation source path");
    if (path === null) return 2;
    if (action === "add") {
      overrides.disabledSources = overrides.disabledSources.filter(
        (p) => p !== path,
      );
      if (!overrides.additionalSources.some((s) => s.path === path))
        overrides.additionalSources.push({ path });
    } else if (action === "remove") {
      overrides.additionalSources = overrides.additionalSources.filter(
        (s) => s.path !== path,
      );
      if (!overrides.disabledSources.includes(path))
        overrides.disabledSources.push(path);
      if (overrides.primary === path) delete overrides.primary;
    } else overrides.primary = path;
  } else {
    const pattern = await input(values.pattern, "Exclusion pattern");
    if (pattern === null) return 2;
    if (action === "add") {
      overrides.excludeRemove = overrides.excludeRemove.filter(
        (p) => p !== pattern,
      );
      if (!overrides.excludeAdd.includes(pattern))
        overrides.excludeAdd.push(pattern);
    } else if (action === "remove") {
      overrides.excludeAdd = overrides.excludeAdd.filter((p) => p !== pattern);
      if (!overrides.excludeRemove.includes(pattern))
        overrides.excludeRemove.push(pattern);
    } else {
      overrides.excludeRemove = overrides.excludeRemove.filter(
        (p) => p !== pattern,
      );
      overrides.excludeAdd = overrides.excludeAdd.filter((p) => p !== pattern);
    }
  }
  const resolved = await resolveProjectConfig(project.root, shared, overrides);
  if (
    !(await approve(
      `Update personal overrides for ${project.name}:\n${JSON.stringify(overrides, null, 2)}\nEffective sources: ${resolved.sources.map((s) => relative(project.root, s.absolutePath) || ".").join(", ")}`,
    ))
  )
    return 2;
  await library.setOverrides(id, overrides, project);
  message(
    "Personal configuration updated. Restart run to load configuration changes.",
  );
  return 0;
}
