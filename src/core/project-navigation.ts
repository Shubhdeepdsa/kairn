import type { DocumentService, DocumentContent } from "./documents.js";
import { createProjectDocumentService, DocumentError } from "./documents.js";
import { loadProjectConfig, resolveProjectConfig } from "./config/project.js";
import { ProjectLibrary } from "./library.js";
import { isProjectId } from "./search-contracts.js";
import type { DocumentDestination, SearchProject } from "./search-contracts.js";
import { analyzeMarkdown } from "./markdown.js";
/** Project-aware navigation independently reusable by search, bookmarks and future Library cards. */
export class ProjectNavigator {
  private cache = new Map<
    string,
    { fingerprint: string; service: DocumentService }
  >();
  constructor(
    private readonly library: ProjectLibrary,
    readonly current: SearchProject,
    private readonly initial: DocumentService,
  ) {}
  /** Only registered identities plus this active transient context; no paths or registration writes. */
  async projects(): Promise<readonly SearchProject[]> {
    return (await this.library.list()).map((p) => ({ id: p.id, name: p.name }));
  }
  /** Revalidate current approval before loading; retain at most two inactive document engines. */
  async documents(id: string): Promise<DocumentService> {
    if (!isProjectId(id))
      throw new DocumentError("INVALID_PATH", "Invalid project identifier.");
    if (id === this.current.id && id.startsWith("session-"))
      return this.initial;
    try {
      const project = await this.library.get(id);
      const resolved = await resolveProjectConfig(
        project.root,
        await loadProjectConfig(project.root),
        project.overrides,
      );
      const fingerprint = JSON.stringify(resolved);
      let entry = this.cache.get(id);
      if (entry?.fingerprint === fingerprint) await entry.service.refresh();
      else
        entry = {
          fingerprint,
          service: await createProjectDocumentService(resolved),
        };
      this.cache.delete(id);
      this.cache.set(id, entry);
      while (this.cache.size > 2)
        this.cache.delete(this.cache.keys().next().value!);
      return entry.service;
    } catch {
      this.cache.delete(id);
      throw new DocumentError(
        "NOT_FOUND",
        "Project or its approved sources are unavailable. Check registration and configuration.",
      );
    }
  }
  /** Validate a destination through approved services and reader heading analysis, independent of search. */
  async open(
    destination: DocumentDestination,
  ): Promise<{ project: SearchProject; content: DocumentContent }> {
    const service = await this.documents(destination.projectId);
    const content = await service.read(destination.documentId);
    if (
      destination.fragment &&
      !analyzeMarkdown(content.markdown).headings.some(
        (h) => h.fragment === destination.fragment,
      )
    )
      throw new DocumentError(
        "NOT_FOUND",
        "The destination heading no longer exists.",
      );
    const project =
      destination.projectId === this.current.id
        ? this.current
        : (await this.projects()).find((p) => p.id === destination.projectId)!;
    return { project, content };
  }
}
