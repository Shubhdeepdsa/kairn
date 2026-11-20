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
  let activeConfig = initialConfig;
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
            activeConfig = config;
            fingerprint = nextFingerprint;
          } else await current.refresh();
          warning = undefined;
        } catch {
          // A vanished approved source is a navigation change, not an instruction
          // to erase its persisted declaration or adopt partially valid settings.
          const absent = await Promise.all(
            (activeConfig?.sources ?? []).map(async (source) => {
              try {
                await lstat(source.absolutePath);
                return false;
              } catch (error) {
                return (
                  error instanceof Error &&
                  "code" in error &&
                  error.code === "ENOENT"
                );
              }
            }),
          );
          if (absent.some(Boolean)) {
            try {
              await current.refresh();
            } catch {
              /* Existing service retains its safe snapshot. */
            }
          }
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
