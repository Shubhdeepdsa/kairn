import { ProjectLibrary } from "./library.js";
import { loadProjectConfig, resolveProjectConfig } from "./config/project.js";
import type { ResolvedProject } from "./config/project.js";

/** Resolve a registered ID or current canonical project; never registers or writes config during run. */
export async function resolveRunProject(
  directory: string,
  projectId: string | undefined,
  library: ProjectLibrary,
): Promise<ResolvedProject | null> {
  const project = projectId
    ? await library.get(projectId)
    : await library.find(directory);
  const root = project?.root ?? directory;
  const shared = await loadProjectConfig(root);
  if (!project && !shared) return null;
  return resolveProjectConfig(root, shared, project?.overrides);
}
