import { isProjectId } from "../../../core/search-contracts.js";
import type { SearchProject } from "../../../core/search-contracts.js";
/** Existing read-only application API. No mutation, arbitrary URL or filesystem method. */
export interface ApiClient {
  getContext(signal?: AbortSignal): Promise<SearchProject>;
  getProjects(signal?: AbortSignal): Promise<readonly SearchProject[]>;
}
/** Stable, redacted client failure; backend payloads never become arbitrary UI messages. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: "NETWORK" | "HTTP" | "INVALID_RESPONSE",
  ) {
    super(
      code === "NETWORK"
        ? "Local server is unavailable. Retry the connection."
        : code === "HTTP"
          ? "Application data is unavailable. Check the local server and retry."
          : "Local server returned an invalid application response.",
    );
  }
}
function project(value: unknown): SearchProject {
  if (
    !value ||
    typeof value !== "object" ||
    !("id" in value) ||
    !("name" in value) ||
    typeof value.id !== "string" ||
    !isProjectId(value.id) ||
    typeof value.name !== "string"
  )
    throw new ApiError(200, "INVALID_RESPONSE");
  return { id: value.id, name: value.name };
}
/** Same-origin fixed GET routes with cancellation and shape validation at the transport boundary. */
export function createApiClient(fetcher: typeof fetch = fetch): ApiClient {
  async function get(path: string, signal?: AbortSignal): Promise<unknown> {
    let response: Response;
    try {
      response = await fetcher(path, {
        method: "GET",
        credentials: "same-origin",
        redirect: "error",
        ...(signal ? { signal } : {}),
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new ApiError(0, "NETWORK");
    }
    if (!response.ok) throw new ApiError(response.status, "HTTP");
    if (!response.headers.get("content-type")?.includes("application/json"))
      throw new ApiError(response.status, "INVALID_RESPONSE");
    try {
      return (await response.json()) as unknown;
    } catch {
      throw new ApiError(response.status, "INVALID_RESPONSE");
    }
  }
  return {
    async getContext(signal) {
      return project(await get("/api/context", signal));
    },
    async getProjects(signal) {
      const value = await get("/api/projects", signal);
      if (
        !value ||
        typeof value !== "object" ||
        !("projects" in value) ||
        !Array.isArray(value.projects)
      )
        throw new ApiError(200, "INVALID_RESPONSE");
      return value.projects.map(project);
    },
  };
}
