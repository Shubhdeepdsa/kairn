import { isProjectId } from "../../../core/search-contracts.js";
import type { SearchProject } from "../../../core/search-contracts.js";
import type {
  NavigationEntry,
  TreeResponse,
  DocumentResponse,
  LinkResolution,
  DocumentHeading,
  LinkDiagnostic,
} from "./types.js";

export type {
  DocumentEntry,
  DirectoryEntry,
  NavigationEntry,
  TreeResponse,
  DocumentHeading,
  LinkDiagnostic,
  DocumentResponse,
  LinkResolution,
} from "./types.js";

/** Existing read-only application API. No mutation, arbitrary URL or filesystem method. */
export interface ApiClient {
  getContext(signal?: AbortSignal): Promise<SearchProject>;
  getProjects(signal?: AbortSignal): Promise<readonly SearchProject[]>;
  getTree(projectId?: string, signal?: AbortSignal): Promise<TreeResponse>;
  getDocument(
    documentId: string,
    projectId?: string,
    signal?: AbortSignal,
  ): Promise<DocumentResponse>;
  resolveLink(
    documentId: string,
    href: string,
    projectId?: string,
    signal?: AbortSignal,
  ): Promise<LinkResolution>;
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

function validateNavigationEntry(value: unknown): NavigationEntry {
  if (!value || typeof value !== "object" || !("kind" in value)) {
    throw new ApiError(200, "INVALID_RESPONSE");
  }
  const entry = value as Record<string, unknown>;
  if (entry.kind === "directory") {
    if (
      typeof entry.path !== "string" ||
      typeof entry.title !== "string" ||
      !Array.isArray(entry.children)
    ) {
      throw new ApiError(200, "INVALID_RESPONSE");
    }
    return {
      kind: "directory",
      path: entry.path,
      title: entry.title,
      children: entry.children.map(validateNavigationEntry),
    };
  }
  if (entry.kind === "document") {
    if (
      typeof entry.id !== "string" ||
      !/^[a-f0-9]{64}$/.test(entry.id) ||
      typeof entry.path !== "string" ||
      typeof entry.title !== "string"
    ) {
      throw new ApiError(200, "INVALID_RESPONSE");
    }
    return {
      kind: "document",
      id: entry.id,
      path: entry.path,
      title: entry.title,
      ...(typeof entry.sourceId === "string"
        ? { sourceId: entry.sourceId }
        : {}),
      ...(typeof entry.legacyId === "string"
        ? { legacyId: entry.legacyId }
        : {}),
      ...(typeof entry.projectPath === "string"
        ? { projectPath: entry.projectPath }
        : {}),
    };
  }
  throw new ApiError(200, "INVALID_RESPONSE");
}

function validateTreeResponse(value: unknown): TreeResponse {
  if (!value || typeof value !== "object" || !("tree" in value)) {
    throw new ApiError(200, "INVALID_RESPONSE");
  }
  const obj = value as Record<string, unknown>;
  if (!Array.isArray(obj.tree)) {
    throw new ApiError(200, "INVALID_RESPONSE");
  }
  return {
    tree: obj.tree.map(validateNavigationEntry),
    ...(typeof obj.warning === "string" ? { warning: obj.warning } : {}),
  };
}

function validateHeading(value: unknown): DocumentHeading {
  if (!value || typeof value !== "object") {
    throw new ApiError(200, "INVALID_RESPONSE");
  }
  const h = value as Record<string, unknown>;
  if (
    typeof h.level !== "number" ||
    typeof h.title !== "string" ||
    typeof h.fragment !== "string"
  ) {
    throw new ApiError(200, "INVALID_RESPONSE");
  }
  return {
    level: h.level,
    title: h.title,
    fragment: h.fragment,
  };
}

function validateDiagnostic(value: unknown): LinkDiagnostic {
  if (!value || typeof value !== "object") {
    throw new ApiError(200, "INVALID_RESPONSE");
  }
  const d = value as Record<string, unknown>;
  if (
    typeof d.target !== "string" ||
    typeof d.code !== "string" ||
    typeof d.message !== "string"
  ) {
    throw new ApiError(200, "INVALID_RESPONSE");
  }
  return {
    ...(typeof d.line === "number" ? { line: d.line } : {}),
    ...(typeof d.column === "number" ? { column: d.column } : {}),
    ...(typeof d.documentId === "string" ? { documentId: d.documentId } : {}),
    target: d.target,
    code: d.code,
    message: d.message,
  };
}

function validateDocumentResponse(value: unknown): DocumentResponse {
  if (!value || typeof value !== "object") {
    throw new ApiError(200, "INVALID_RESPONSE");
  }
  const doc = value as Record<string, unknown>;
  if (
    typeof doc.id !== "string" ||
    !/^[a-f0-9]{64}$/.test(doc.id) ||
    typeof doc.path !== "string" ||
    typeof doc.title !== "string" ||
    typeof doc.markdown !== "string" ||
    typeof doc.revision !== "string" ||
    !Array.isArray(doc.headings) ||
    !Array.isArray(doc.diagnostics)
  ) {
    throw new ApiError(200, "INVALID_RESPONSE");
  }
  return {
    id: doc.id,
    path: doc.path,
    title: doc.title,
    markdown: doc.markdown,
    revision: doc.revision,
    headings: doc.headings.map(validateHeading),
    diagnostics: doc.diagnostics.map(validateDiagnostic),
    ...(typeof doc.html === "string" ? { html: doc.html } : {}),
  };
}

function validateLinkResolution(value: unknown): LinkResolution {
  if (!value || typeof value !== "object" || !("kind" in value)) {
    throw new ApiError(200, "INVALID_RESPONSE");
  }
  const res = value as Record<string, unknown>;
  if (res.kind === "document") {
    if (typeof res.id !== "string" || typeof res.fragment !== "string") {
      throw new ApiError(200, "INVALID_RESPONSE");
    }
    return { kind: "document", id: res.id, fragment: res.fragment };
  }
  if (res.kind === "external") {
    if (typeof res.href !== "string") {
      throw new ApiError(200, "INVALID_RESPONSE");
    }
    return { kind: "external", href: res.href };
  }
  if (res.kind === "diagnostic") {
    return {
      kind: "diagnostic",
      diagnostic: validateDiagnostic(res.diagnostic),
    };
  }
  throw new ApiError(200, "INVALID_RESPONSE");
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
    async getTree(projectId, signal) {
      if (projectId !== undefined && !isProjectId(projectId)) {
        throw new ApiError(400, "INVALID_RESPONSE");
      }
      const path = projectId ? `/api/projects/${projectId}/tree` : "/api/tree";
      return validateTreeResponse(await get(path, signal));
    },
    async getDocument(documentId, projectId, signal) {
      if (!/^[a-f0-9]{64}$/.test(documentId)) {
        throw new ApiError(400, "INVALID_RESPONSE");
      }
      if (projectId !== undefined && !isProjectId(projectId)) {
        throw new ApiError(400, "INVALID_RESPONSE");
      }
      const path = projectId
        ? `/api/projects/${projectId}/documents/${documentId}`
        : `/api/documents/${documentId}`;
      return validateDocumentResponse(await get(path, signal));
    },
    async resolveLink(documentId, href, projectId, signal) {
      if (!/^[a-f0-9]{64}$/.test(documentId)) {
        throw new ApiError(400, "INVALID_RESPONSE");
      }
      if (projectId !== undefined && !isProjectId(projectId)) {
        throw new ApiError(400, "INVALID_RESPONSE");
      }
      const encodedHref = encodeURIComponent(href);
      const path = projectId
        ? `/api/projects/${projectId}/links/${documentId}/${encodedHref}`
        : `/api/links/${documentId}/${encodedHref}`;
      return validateLinkResolution(await get(path, signal));
    },
  };
}
