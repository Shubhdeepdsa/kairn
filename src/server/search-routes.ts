import { DocumentError } from "../core/documents.js";
import type { DocumentService } from "../core/documents.js";
import type { ProjectNavigator } from "../core/project-navigation.js";
import type { SearchService } from "../core/search-service.js";
import { isProjectId } from "../core/search-contracts.js";
/** Optional application capabilities, injected by CLI composition; no filesystem algorithms in HTTP. */
export interface SearchApplication {
  readonly navigator: ProjectNavigator;
  readonly search: SearchService;
}
/** Narrow query decoder; no arbitrary query strings on document or asset routes. */
export async function searchRoute(
  target: string,
  application: SearchApplication,
): Promise<unknown> {
  if (target === "/api/context") return application.navigator.current;
  if (target === "/api/projects")
    return { projects: await application.navigator.projects() };
  const url = new URL(target, "http://localhost");
  if (url.pathname !== "/api/search")
    throw new DocumentError("INVALID_PATH", "Invalid search route.");
  try {
    decodeURIComponent(url.search);
  } catch {
    throw new DocumentError("INVALID_PATH", "Malformed search encoding.");
  }
  const params = url.searchParams;
  if (
    [...params.keys()].some(
      (k) => !["query", "project", "limit"].includes(k),
    ) ||
    [...new Set(params.keys())].some((k) => params.getAll(k).length !== 1)
  )
    throw new DocumentError(
      "INVALID_PATH",
      "Use query, optional project and limit only.",
    );
  const projectId = params.get("project");
  if (projectId !== null && !isProjectId(projectId))
    throw new DocumentError("INVALID_PATH", "Invalid project identifier.");
  try {
    return await application.search.search({
      query: params.get("query") ?? "",
      limit: Number(params.get("limit") ?? 20),
      scope:
        projectId === null
          ? { type: "global" }
          : { type: "project", projectId },
    });
  } catch {
    throw new DocumentError(
      "INVALID_PATH",
      "Search could not complete. Check query limits, cache availability and project configuration.",
    );
  }
}
/** Map a validated project identity to the existing tree/document/link adapter, never to a filesystem path. */
export async function projectRoute(
  target: string,
  application: SearchApplication,
): Promise<{ target: string; documents: DocumentService }> {
  const match =
    /^\/api\/projects\/([^/]+)(\/tree|\/documents\/[^/]+|\/links\/[a-f0-9]{64}\/[^/]+)$/.exec(
      target,
    );
  if (!match || !isProjectId(match[1]!))
    throw new DocumentError("INVALID_PATH", "Invalid project document route.");
  return {
    target: "/api" + match[2]!,
    documents: await application.navigator.documents(match[1]!),
  };
}
