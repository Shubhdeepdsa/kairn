import { join } from "node:path";
import { rm } from "node:fs/promises";
import { ProjectLibrary } from "./library.js";
import { loadProjectConfig, resolveProjectConfig } from "./config/project.js";
import {
  createDocumentService,
  createProjectDocumentService,
} from "./documents.js";
import type {
  DocumentEntry,
  DocumentService,
  NavigationEntry,
} from "./documents.js";
import { documentRevision } from "./freshness.js";
import { SearchIndex } from "./search-index.js";
import { querySearchIndex, searchTerms } from "./search-query.js";
import type {
  SearchProject,
  SearchRequest,
  SearchResponse,
  ProjectCoverage,
} from "./search-contracts.js";
/** Active session is private to this application, not a Library registration. Roots never cross the HTTP boundary. */
export interface SearchSession extends SearchProject {
  readonly root: string;
  readonly docsRoot: string;
  readonly configured: boolean;
}
/** Shared immutable application options, safe to pass to a local job worker. */
export interface SearchOptions {
  readonly dataDirectory: string;
  readonly reconcileIntervalMs?: number;
  readonly session?: SearchSession;
}
function files(tree: readonly NavigationEntry[]): DocumentEntry[] {
  return tree.flatMap((n) => (n.kind === "document" ? [n] : files(n.children)));
}
/**
 * Application-level approved-source reconciliation. Production hosts this in a worker.
 * No daemons/watchers: bounded jobs on search, content hashes skip needless extraction,
 * config changes prune approvals before results. Every response reports exact coverage.
 */
export class SearchCoordinator {
  private index: SearchIndex | undefined;
  private sessionIndex: SearchIndex | undefined;
  private offsets = new Map<string, { signature: string; offset: number }>();
  private queue: Promise<unknown> = Promise.resolve();
  private cursor = 0;
  private recent = new Map<
    string,
    { signature: string; at: number; count: number }
  >();
  constructor(private readonly options: SearchOptions) {}
  /** Serialize requests from one instance; other processes coordinate through SQLite transactions. */
  search(request: SearchRequest): Promise<SearchResponse> {
    searchTerms(request);
    const job = this.queue.then(() => this.run(request));
    this.queue = job.catch(() => undefined);
    return job;
  }
  private async run(request: SearchRequest): Promise<SearchResponse> {
    const library = new ProjectLibrary(this.options.dataDirectory);
    const registered = await library.list();
    const transient =
      request.scope.type === "project" &&
      request.scope.projectId === this.options.session?.id;
    let index: SearchIndex;
    if (transient)
      index = this.sessionIndex ??= await SearchIndex.open(
        join(this.options.dataDirectory, "search", this.options.session!.id),
      );
    else
      index = this.index ??= await SearchIndex.open(
        join(this.options.dataDirectory, "search"),
      );
    if (!transient) index.retainProjects(new Set(registered.map((p) => p.id)));
    const scope = request.scope;
    const projects: SearchProject[] = transient
      ? [{ id: this.options.session!.id, name: this.options.session!.name }]
      : registered
          .filter((p) => scope.type === "global" || p.id === scope.projectId)
          .map((p) => ({ id: p.id, name: p.name }));
    if (scope.type === "project" && !projects.length)
      return {
        results: [],
        coverage: [
          {
            id: scope.projectId,
            name: "Unavailable project",
            status: "unavailable",
            indexed: 0,
            total: 0,
            message: "Project is not registered in this application.",
          },
        ],
      };
    const coverage: ProjectCoverage[] = [];
    const eligible: SearchProject[] = [];
    let remaining = 200;
    let bytes = 0;
    const started = performance.now();
    const ordered = [
      ...projects.slice(this.cursor),
      ...projects.slice(0, this.cursor),
    ];
    let visited = 0;
    for (const p of ordered) {
      if (
        remaining <= 0 ||
        bytes >= 8_388_608 ||
        (visited > 0 && performance.now() - started > 250) ||
        visited >= 32
      ) {
        coverage.push({
          ...p,
          status: "indexing",
          indexed: 0,
          total: 0,
          message:
            "Not checked in this bounded job; request search again to continue.",
        });
        continue;
      }
      visited++;
      try {
        let service: DocumentService;
        let configSignature = "session";
        if (
          transient &&
          !this.options.session!.configured &&
          !(await loadProjectConfig(this.options.session!.root))
        )
          service = await createDocumentService(this.options.session!.docsRoot);
        else {
          const registeredProject = transient
            ? undefined
            : registered.find((r) => r.id === p.id);
          const root = transient
            ? this.options.session!.root
            : registeredProject!.root;
          const resolved = await resolveProjectConfig(
            root,
            await loadProjectConfig(root),
            registeredProject?.overrides,
          );
          configSignature = JSON.stringify(resolved);
          const recent = this.recent.get(p.id);
          if (
            !request.refresh &&
            recent?.signature === configSignature &&
            performance.now() - recent.at <
              (this.options.reconcileIntervalMs ?? 1500)
          ) {
            coverage.push({
              id: p.id,
              name: p.name,
              status: "ready",
              indexed: recent.count,
              total: recent.count,
            });
            eligible.push({ id: p.id, name: p.name });
            continue;
          }
          service = await createProjectDocumentService(resolved);
        }
        const entries = files(service.tree);
        index.prune(p.id, new Set(entries.map((e) => e.id)));
        const signature = documentRevision(
          configSignature + JSON.stringify(service.tree),
        );
        const previous = this.offsets.get(p.id);
        const start = previous?.signature === signature ? previous.offset : 0;
        let end = start;
        let failed = false;
        for (
          ;
          end < entries.length && remaining > 0 && bytes < 8_388_608;
          end++
        ) {
          const e = entries[end]!;
          remaining--;
          try {
            const content = await service.read(e.id);
            bytes += Buffer.byteLength(content.markdown);
            index.put({
              projectId: p.id,
              documentId: e.id,
              sourceId: e.sourceId ?? "docs",
              path: e.projectPath ?? e.path,
              title: e.title,
              revision: documentRevision(content.markdown),
              markdown: content.markdown,
            });
          } catch {
            failed = true;
            // A failed read cannot retain stale searchable bytes.
            index.prune(
              p.id,
              new Set(entries.filter((x) => x.id !== e.id).map((x) => x.id)),
            );
          }
          if (performance.now() - started > 250) {
            end++;
            break;
          }
        }
        const complete = end >= entries.length;
        if (complete && !failed)
          this.recent.set(p.id, {
            signature: configSignature,
            at: performance.now(),
            count: entries.length,
          });
        else this.recent.delete(p.id);
        this.offsets.set(p.id, { signature, offset: complete ? 0 : end });
        coverage.push({
          id: p.id,
          name: p.name,
          status: failed ? "partial" : complete ? "ready" : "indexing",
          indexed: index.documentCount(p.id),
          total: entries.length,
          ...(!complete || failed
            ? {
                message:
                  "Some documents were not checked in this job. Search again to continue.",
              }
            : {}),
        });
        eligible.push({ id: p.id, name: p.name });
      } catch {
        this.recent.delete(p.id);
        index.prune(p.id, new Set());
        coverage.push({
          id: p.id,
          name: p.name,
          status: "unavailable",
          indexed: 0,
          total: 0,
          message:
            "Project or approved sources cannot be read. Check registration and configuration.",
        });
      }
    }
    this.cursor = projects.length
      ? (this.cursor + visited) % projects.length
      : 0;
    return { results: querySearchIndex(index, request, eligible), coverage };
  }
  /** Drain queued jobs, close all database handles, remove only this generated transient cache. */
  async close(): Promise<void> {
    await this.queue;
    this.index?.close();
    this.sessionIndex?.close();
    if (this.options.session && this.sessionIndex)
      await rm(
        join(this.options.dataDirectory, "search", this.options.session.id),
        { recursive: true, force: true },
      );
  }
}
