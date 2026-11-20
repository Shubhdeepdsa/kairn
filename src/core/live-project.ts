import { lstat, realpath } from "node:fs/promises";
import { createProjectDocumentService, DocumentError } from "./documents.js";
import type { DocumentService, NavigationEntry } from "./documents.js";
import type { ResolvedProject } from "./config/project.js";

/** Application-level config refresh; swaps only complete validated document services. No persistence or prompts. */
export async function createReloadingDocumentService(
  initial: DocumentService,
  projectRoot: string,
  initialConfig: ResolvedProject | null,
  load: () => Promise<ResolvedProject | null>,
): Promise<DocumentService> {
  const root = await realpath(projectRoot);
  const identity = await lstat(root);
  let current = initial;
  let fingerprint = JSON.stringify(initialConfig);
  let warning: string | undefined;
  let pending: Promise<readonly NavigationEntry[]> | undefined;
  return {
    get root() {
      return current.root;
    },
    get tree() {
      return current.tree;
    },
    get warning() {
      return warning;
    },
    read(id) {
      return current.read(id);
    },
    linkTargets: () => current.linkTargets?.() ?? [],
    classifyLinkTarget: (path: string) =>
      current.classifyLinkTarget?.(path) ?? "UNREGISTERED",
    refresh() {
      pending ??= (async () => {
        try {
          const now = await lstat(root);
          if (
            now.isSymbolicLink() ||
            now.dev !== identity.dev ||
            now.ino !== identity.ino
          )
            throw new DocumentError(
              "CHANGED",
              "Project root changed. Restart the viewer.",
            );
          const config = await load();
          const nextFingerprint = JSON.stringify(config);
          if (nextFingerprint !== fingerprint) {
            if (!config)
              throw new Error(
                "Configuration removed without a valid fallback.",
              );
            const next = await createProjectDocumentService(config);
            current = next;
            fingerprint = nextFingerprint;
          } else await current.refresh();
          warning = undefined;
        } catch {
          warning =
            "Project configuration or sources could not be refreshed. Fix the JSON/source paths or restore the registration; the last valid reader state is retained.";
        }
        return current.tree;
      })().finally(() => {
        pending = undefined;
      });
      return pending;
    },
  };
}
