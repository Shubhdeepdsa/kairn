import { randomUUID } from "node:crypto";
import { dirname, basename } from "node:path";
import { ProjectNavigator } from "../core/project-navigation.js";
import { SearchService } from "../core/search-service.js";
import type { ProjectLibrary } from "../core/library.js";
import type { SearchProject } from "../core/search-contracts.js";
import { createReloadingDocumentService } from "../core/live-project.js";
import { resolve } from "node:path";
import { discoverDocumentationRoot } from "../core/initialization.js";
import {
  createDocumentService,
  createProjectDocumentService,
} from "../core/documents.js";
import { startDocumentationServer } from "../server/http.js";
import type { ViewerPresentation } from "../server/http.js";

import type { ResolvedProject } from "../core/config/project.js";

/** CLI capabilities and lifetime; browser/prompt actions are injected and never used by core. */
export interface RunContext {
  readonly directory: string;
  readonly library?: ProjectLibrary;
  readonly currentProject?: SearchProject;
  readonly project?: ResolvedProject;
  readonly reloadProject?: () => Promise<ResolvedProject | null>;
  readonly projectRoot?: string;
  readonly port: number;
  readonly noOpen: boolean;
  readonly interactive: boolean;
  readonly canOpenBrowser: boolean;
  readonly signal: AbortSignal;
  readonly viewer: ViewerPresentation;
  chooseRoot(): Promise<string | null>;
  openBrowser(url: string): Promise<void>;
  message(text: string): void;
}

/**
 * Discover existing docs, serve them until aborted, then close all HTTP connections.
 * No files are created; only a missing docs root may trigger an interactive prompt.
 * @returns 0 after clean shutdown, or 2 when directory selection is canceled.
 * @throws For discovery/read/listen errors. Browser-open failures only produce guidance.
 */
export async function runDocumentation(context: RunContext): Promise<number> {
  if (context.signal.aborted) return 0;
  let root =
    context.project?.root ??
    (await discoverDocumentationRoot(context.directory));
  if (root === null) {
    if (!context.interactive)
      throw new Error(
        "No docs/ directory found. Use --cwd with a project containing docs/, or run in a terminal to choose an existing documentation directory.",
      );
    context.message(
      "No docs/ directory found. Run is read-only; nothing will be created.",
    );
    const chosen = await context.chooseRoot();
    if (chosen === null || chosen.trim() === "") {
      context.message("Canceled. No changes made.");
      return 2;
    }
    root = resolve(context.directory, chosen);
  }
  let documents = context.project
    ? await createProjectDocumentService(context.project)
    : await createDocumentService(root);
  if (context.reloadProject)
    documents = await createReloadingDocumentService(
      documents,
      context.projectRoot ?? context.directory,
      context.project ?? null,
      context.reloadProject,
    );
  if (context.signal.aborted) return 0;
  const current = context.currentProject ?? {
    id: "session-" + randomUUID().replace(/-/g, ""),
    name:
      context.project?.name ??
      basename(context.projectRoot ?? context.directory),
  };
  const search = context.library
    ? new SearchService({
        dataDirectory: dirname(context.library.file),
        ...(!context.currentProject
          ? {
              session: {
                ...current,
                root: context.projectRoot ?? context.directory,
                docsRoot: root,
                configured: Boolean(context.project),
              },
            }
          : {}),
      })
    : undefined;
  const application =
    context.library && search
      ? {
          navigator: new ProjectNavigator(context.library, current, documents),
          search,
        }
      : undefined;
  const server = await startDocumentationServer(documents, {
    ...(application ? { application } : {}),
    port: context.port,
    viewer: context.viewer,
  });
  let onAbort: (() => void) | undefined;
  try {
    const stopped = new Promise<void>((resolve) => {
      onAbort = () => resolve();
      if (context.signal.aborted) resolve();
      else context.signal.addEventListener("abort", onAbort, { once: true });
    });
    context.message(`Documentation: ${documents.root}`);
    context.message(`Kairn is reading at ${server.url}`);
    context.message("Press Ctrl+C to stop.");
    if (!context.noOpen && context.canOpenBrowser && !context.signal.aborted) {
      try {
        await context.openBrowser(server.url);
      } catch {
        context.message(
          `Could not open a browser. Open ${server.url} manually.`,
        );
      }
    } else if (!context.noOpen && !context.canOpenBrowser)
      context.message(
        "Headless session: open the printed address in a local browser.",
      );
    await stopped;
  } finally {
    if (onAbort) context.signal.removeEventListener("abort", onAbort);
    await server.close();
    await search?.close();
    context.message("Kairn stopped.");
  }
  return 0;
}
