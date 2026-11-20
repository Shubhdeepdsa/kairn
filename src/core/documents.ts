import { constants } from "node:fs";
import { lstat, open, opendir, realpath } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  basename,
  dirname,
  join,
  parse,
  resolve,
  relative,
  isAbsolute,
} from "node:path";

import type { DocumentTarget, LinkCode } from "./document-links.js";
import type { ResolvedProject } from "./config/project.js";
import { assertRealPath } from "./config/storage.js";
import { compileExclusions } from "./sources.js";

/** Stable failure categories shared with adapters; messages contain no absolute paths. */
export type DocumentErrorCode =
  "INVALID_PATH" | "NOT_FOUND" | "ACCESS_DENIED" | "LIMIT_EXCEEDED" | "CHANGED";

/** Expected document failures; adapters may map codes to their own presentation. */
export class DocumentError extends Error {
  constructor(
    public readonly code: DocumentErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DocumentError";
  }
}

/** Opaque ID and source-relative POSIX path; absolute identity stays in core. */
export interface DocumentEntry {
  readonly kind: "document";
  readonly id: string;
  readonly path: string;
  readonly title: string;
  readonly sourceId?: string;
  readonly legacyId?: string;
  readonly projectPath?: string;
}

/** Deterministic directory-first navigation; no empty directories are exposed. */
export interface DirectoryEntry {
  readonly kind: "directory";
  readonly path: string;
  readonly title: string;
  readonly children: readonly NavigationEntry[];
}
export type NavigationEntry = DirectoryEntry | DocumentEntry;

/** A bounded fresh read; canonicalPath is for local consumers, never HTTP output. */
export interface DocumentContent {
  readonly id: string;
  readonly path: string;
  readonly title: string;
  readonly canonicalPath: string;
  readonly markdown: string;
}

/** HTTP-independent read-only service with atomically replaceable navigation snapshots. */
export interface DocumentService {
  readonly root: string;
  readonly tree: readonly NavigationEntry[];
  readonly warning?: string | undefined;
  read(id: string): Promise<DocumentContent>;
  /** Internal canonical index for core link resolution, never HTTP output. */
  linkTargets?(): readonly DocumentTarget[];
  classifyLinkTarget?(
    path: string,
  ): Extract<LinkCode, "MISSING" | "EXCLUDED" | "UNREGISTERED">;
  /** Rescan the original root within the same limits; concurrent calls share one scan. Failed scans retain the last valid snapshot. */
  refresh(): Promise<readonly NavigationEntry[]>;
}

/** Optional lower limits, primarily for embedders and deterministic tests. */
export interface DocumentLimits {
  readonly entries: number;
  readonly documents: number;
  readonly depth: number;
  readonly fileBytes: number;
}

/** Hard maximums: bounded traversal and bounded single-document memory usage. */
export const documentLimits: Readonly<DocumentLimits> = Object.freeze({
  entries: 10_000,
  documents: 2_000,
  depth: 32,
  fileBytes: 1_048_576,
});

function fail(code: DocumentErrorCode, message: string): never {
  throw new DocumentError(code, message);
}
function translated(error: unknown): never {
  if (error instanceof DocumentError) throw error;
  const code = error instanceof Error && "code" in error ? error.code : "";
  if (code === "ENOENT" || code === "ENOTDIR")
    fail("NOT_FOUND", "Documentation path no longer exists.");
  if (code === "EACCES" || code === "EPERM")
    fail(
      "ACCESS_DENIED",
      "Documentation path is not readable. Check its permissions.",
    );
  fail("INVALID_PATH", "Documentation path cannot be read safely.");
}

/** Build one bounded snapshot, shared by initial discovery and refresh. */
async function scanDocuments(
  directory: string,
  limits: Partial<DocumentLimits>,
  selection?: {
    file?: string;
    excluded: (path: string) => boolean;
    budget: { entries: number; documents: number };
  },
): Promise<Omit<DocumentService, "refresh">> {
  const bounds = { ...documentLimits, ...limits };
  for (const key of Object.keys(bounds) as (keyof DocumentLimits)[]) {
    if (
      !Number.isSafeInteger(bounds[key]) ||
      bounds[key] < 1 ||
      bounds[key] > documentLimits[key]
    )
      fail(
        "LIMIT_EXCEEDED",
        "Document limits must be positive and no greater than hard maximums.",
      );
  }
  try {
    const selected = resolve(directory);
    const initial = await lstat(selected);
    if (!initial.isDirectory() || initial.isSymbolicLink())
      fail(
        "INVALID_PATH",
        "Select a real documentation directory, not a symlink or file.",
      );
    const root = await realpath(selected);
    if (root === parse(root).root)
      fail(
        "INVALID_PATH",
        "A filesystem root cannot be used as documentation.",
      );
    const identity = await lstat(root);
    const files = new Map<
      string,
      { entry: DocumentEntry; canonicalPath: string }
    >();
    let visited = 0;
    async function walk(
      path: string,
      relative: string,
      depth: number,
    ): Promise<readonly NavigationEntry[]> {
      if (depth > bounds.depth)
        fail(
          "LIMIT_EXCEEDED",
          "Documentation directory nesting limit exceeded.",
        );
      const nodes: NavigationEntry[] = [];
      const directoryHandle = await opendir(path);
      for await (const child of directoryHandle) {
        if (
          ++visited > bounds.entries ||
          (selection && ++selection.budget.entries > documentLimits.entries)
        )
          fail("LIMIT_EXCEEDED", "Documentation scan entry limit exceeded.");
        if (child.name.startsWith(".")) continue;
        const sourcePath = relative ? `${relative}/${child.name}` : child.name;
        if (selection?.file && sourcePath !== selection.file) continue;
        if (
          selection?.excluded(sourcePath) ||
          selection?.excluded(sourcePath + "/")
        )
          continue;
        const full = join(path, child.name);
        const info = await lstat(full);
        if (info.isSymbolicLink())
          fail(
            "INVALID_PATH",
            "Symlinks are not allowed in the documentation tree.",
          );
        if (info.isDirectory()) {
          const children = await walk(full, sourcePath, depth + 1);
          if (children.length)
            nodes.push(
              Object.freeze({
                kind: "directory",
                path: sourcePath,
                title: child.name,
                children,
              }),
            );
        } else if (info.isFile()) {
          if (!/\.(md|markdown)$/i.test(child.name)) continue;
          if (info.size > bounds.fileBytes)
            fail("LIMIT_EXCEEDED", "Markdown file exceeds the size limit.");
          if (
            files.size >= bounds.documents ||
            (selection &&
              ++selection.budget.documents > documentLimits.documents)
          )
            fail("LIMIT_EXCEEDED", "Documentation file count limit exceeded.");
          const id = createHash("sha256").update(sourcePath).digest("hex");
          const entry: DocumentEntry = Object.freeze({
            kind: "document",
            id,
            path: sourcePath,
            title: child.name.replace(/\.(md|markdown)$/i, ""),
          });
          const canonicalPath = await realpath(full);
          if (canonicalPath !== full)
            fail(
              "CHANGED",
              "Documentation changed during discovery. Restart the viewer.",
            );
          files.set(id, { entry, canonicalPath });
          nodes.push(entry);
        } else
          fail(
            "INVALID_PATH",
            "Special files are not allowed in the documentation tree.",
          );
      }
      nodes.sort((a, b) =>
        a.kind === b.kind
          ? a.path < b.path
            ? -1
            : a.path > b.path
              ? 1
              : 0
          : a.kind === "directory"
            ? -1
            : 1,
      );
      return Object.freeze(nodes);
    }
    const tree = await walk(root, "", 0);
    async function read(id: string): Promise<DocumentContent> {
      try {
        if (!/^[a-f0-9]{64}$/.test(id))
          fail("INVALID_PATH", "Invalid document identifier.");
        const record = files.get(id);
        if (!record) fail("NOT_FOUND", "Document was not found.");
        const now = await lstat(root);
        if (
          now.isSymbolicLink() ||
          !now.isDirectory() ||
          now.dev !== identity.dev ||
          now.ino !== identity.ino
        )
          fail("CHANGED", "Documentation root changed. Restart the viewer.");
        let current = root;
        const parts = record.entry.path.split("/");
        for (const [index, part] of parts.entries()) {
          current = join(current, part);
          const entry = await lstat(current);
          if (
            entry.isSymbolicLink() ||
            (index < parts.length - 1 ? !entry.isDirectory() : !entry.isFile())
          )
            fail(
              "INVALID_PATH",
              "Document path is no longer a regular file within the root.",
            );
        }
        if ((await realpath(current)) !== record.canonicalPath)
          fail("CHANGED", "Document path changed. Restart the viewer.");
        const before = await lstat(current);
        const handle = await open(
          current,
          constants.O_RDONLY |
            (process.platform === "win32" ? 0 : constants.O_NOFOLLOW),
        );
        try {
          const opened = await handle.stat();
          if (
            !opened.isFile() ||
            before.dev !== opened.dev ||
            before.ino !== opened.ino
          )
            fail("CHANGED", "Document changed while opening. Try again.");
          if (opened.size > bounds.fileBytes)
            fail("LIMIT_EXCEEDED", "Markdown file exceeds the size limit.");
          const buffer = Buffer.alloc(bounds.fileBytes + 1);
          let bytes = 0;
          while (bytes < buffer.length) {
            const result = await handle.read(
              buffer,
              bytes,
              buffer.length - bytes,
              null,
            );
            if (result.bytesRead === 0) break;
            bytes += result.bytesRead;
          }
          if (bytes > bounds.fileBytes)
            fail("LIMIT_EXCEEDED", "Markdown file exceeds the size limit.");
          return {
            id,
            path: record.entry.path,
            title: record.entry.title,
            canonicalPath: record.canonicalPath,
            markdown: buffer.toString("utf8", 0, bytes),
          };
        } finally {
          await handle.close();
        }
      } catch (error) {
        return translated(error);
      }
    }
    return Object.freeze({
      root,
      tree,
      read,
      linkTargets: () =>
        [...files.entries()].map(([id, record]) => ({
          id,
          canonicalPath: record.canonicalPath,
        })),
      classifyLinkTarget: (
        path: string,
      ): "MISSING" | "EXCLUDED" | "UNREGISTERED" => {
        const local = relative(root, path);
        if (
          isAbsolute(local) ||
          local === ".." ||
          local.startsWith(".." + (process.platform === "win32" ? "\\" : "/"))
        )
          return "UNREGISTERED";
        return local.split(/[\\/]/).some((part) => part.startsWith("."))
          ? "EXCLUDED"
          : /\.(md|markdown)$/i.test(local)
            ? "MISSING"
            : "UNREGISTERED";
      },
    });
  } catch (error) {
    return translated(error);
  }
}

/**
 * Discover one read-only root and expose bounded refreshes with stable path-based IDs.
 * Hidden entries remain excluded; symlinks and special files are rejected.
 * @param directory - Existing documentation directory, never a symlink or filesystem root.
 * @param limits - Optional positive lower limits capped by documentLimits.
 * @returns A service whose tree and ID mapping are swapped together after successful refresh.
 * @throws DocumentError for inaccessible/invalid paths or scan limits. Refresh never adopts a replacement root.
 */
export async function createDocumentService(
  directory: string,
  limits: Partial<DocumentLimits> = {},
): Promise<DocumentService> {
  try {
    const bounds = { ...limits };
    const identity = await lstat(resolve(directory));
    let snapshot = await scanDocuments(directory, bounds);
    const root = snapshot.root;
    async function validateIdentity(): Promise<void> {
      const current = await lstat(root);
      if (
        !current.isDirectory() ||
        current.isSymbolicLink() ||
        current.dev !== identity.dev ||
        current.ino !== identity.ino
      )
        fail("CHANGED", "Documentation root changed. Restart the viewer.");
    }
    await validateIdentity();
    let pending: Promise<readonly NavigationEntry[]> | undefined;
    return Object.freeze({
      root,
      get tree() {
        return snapshot.tree;
      },
      read(id: string) {
        return snapshot.read(id);
      },
      linkTargets: () => snapshot.linkTargets?.() ?? [],
      classifyLinkTarget: (path: string) =>
        snapshot.classifyLinkTarget?.(path) ?? "UNREGISTERED",
      refresh() {
        pending ??= (async () => {
          try {
            await validateIdentity();
            const next = await scanDocuments(root, bounds);
            await validateIdentity();
            snapshot = next;
            return snapshot.tree;
          } catch (error) {
            return translated(error);
          }
        })().finally(() => {
          pending = undefined;
        });
        return pending;
      },
    });
  } catch (error) {
    return translated(error);
  }
}

/**
 * Compose approved sources using the existing bounded scanner/reader. Primary navigation
 * is unwrapped; additional sources retain labeled provenance. Canonical duplicates are
 * emitted once (primary first), IDs depend on physical paths, not titles or ordering.
 * Refresh skips disappeared sources without changing persistent declarations; unsafe
 * replacements fail and retain the prior snapshot. No absolute paths enter tree output.
 */
export async function createProjectDocumentService(
  project: ResolvedProject,
): Promise<DocumentService> {
  const excluded = compileExclusions(project.exclude);
  const identities = new Map<string, { dev: number; ino: number }>();
  const projectIdentity = await lstat(project.root);
  const sources = [...project.sources].sort(
    (a, b) => Number(b.primary) - Number(a.primary),
  );
  async function snapshot(
    initial: boolean,
  ): Promise<Omit<DocumentService, "refresh">> {
    const currentRoot = await lstat(project.root);
    if (
      currentRoot.isSymbolicLink() ||
      currentRoot.dev !== projectIdentity.dev ||
      currentRoot.ino !== projectIdentity.ino
    )
      fail("CHANGED", "Project root changed. Restart the viewer.");
    const budget = { entries: 0, documents: 0 };
    const seen = new Set<string>();
    const records = new Map<
      string,
      {
        service: Omit<DocumentService, "refresh">;
        original: string;
        entry: DocumentEntry;
      }
    >();
    const tree: NavigationEntry[] = [];
    for (const source of sources) {
      try {
        await assertRealPath(source.absolutePath);
        const info = await lstat(source.absolutePath);
        const identity = identities.get(source.id);
        if (
          identity &&
          source.kind === "directory" &&
          (identity.dev !== info.dev || identity.ino !== info.ino)
        )
          fail("CHANGED", "Documentation source replaced. Restart the viewer.");
        if (!identity)
          identities.set(source.id, { dev: info.dev, ino: info.ino });
        if (source.kind === "file" ? !info.isFile() : !info.isDirectory())
          fail("INVALID_PATH", "Documentation source type changed.");
        const service = await scanDocuments(
          source.kind === "file"
            ? dirname(source.absolutePath)
            : source.absolutePath,
          {},
          {
            ...(source.kind === "file"
              ? { file: basename(source.absolutePath) }
              : {}),
            excluded,
            budget,
          },
        );
        function transform(
          nodes: readonly NavigationEntry[],
        ): NavigationEntry[] {
          return nodes.flatMap((node): NavigationEntry[] => {
            if (node.kind === "directory") {
              const children = transform(node.children);
              return children.length
                ? [{ ...node, path: `${source.id}/${node.path}`, children }]
                : [];
            }
            const physical = join(service.root, node.path);
            if (seen.has(physical)) return [];
            seen.add(physical);
            const id = createHash("sha256").update(physical).digest("hex");
            const projectPath = source.external
              ? undefined
              : source.kind === "file"
                ? source.path
                : source.path === "."
                  ? node.path
                  : `${source.path}/${node.path}`;
            const entry: DocumentEntry = {
              ...node,
              id,
              sourceId: source.id,
              ...(source.path === "docs" && !source.external
                ? { legacyId: node.id }
                : {}),
              ...(projectPath ? { projectPath } : {}),
            };
            records.set(id, { service, original: node.id, entry });
            return [entry];
          });
        }
        const children = transform(service.tree);
        if (source.primary) tree.push(...children);
        else if (children.length)
          tree.push({
            kind: "directory",
            path: source.id,
            title: source.external
              ? `${source.label} (local source)`
              : source.path,
            children,
          });
      } catch (error) {
        if (
          !initial &&
          ((error instanceof DocumentError && error.code === "NOT_FOUND") ||
            (error instanceof Error &&
              "code" in error &&
              error.code === "ENOENT"))
        )
          continue;
        throw error;
      }
    }
    return {
      root: project.root,
      tree,
      linkTargets: () =>
        [...records.entries()].map(([id, record]) => ({
          id,
          canonicalPath: record.service.linkTargets!().find(
            (target) => target.id === record.original,
          )!.canonicalPath,
        })),
      classifyLinkTarget(path: string) {
        for (const source of sources) {
          const local =
            source.kind === "file"
              ? basename(path)
              : relative(source.absolutePath, path);
          const contained =
            source.kind === "file"
              ? path === source.absolutePath
              : !isAbsolute(local) &&
                local !== ".." &&
                !local.startsWith("../") &&
                !local.startsWith("..\\");
          if (!contained) continue;
          if (
            excluded(local) ||
            (source.kind === "directory" &&
              local.split(/[\\/]/).some((part) => part.startsWith(".")))
          )
            return "EXCLUDED";
          return /\.(md|markdown)$/i.test(path) ? "MISSING" : "UNREGISTERED";
        }
        return "UNREGISTERED";
      },
      async read(id) {
        if (!/^[a-f0-9]{64}$/.test(id))
          fail("INVALID_PATH", "Invalid document identifier.");
        const record = records.get(id);
        if (!record) fail("NOT_FOUND", "Document was not found.");
        const content = await record.service.read(record.original);
        return { ...content, id, path: record.entry.path };
      },
    };
  }
  let current = await snapshot(true);
  let pending: Promise<readonly NavigationEntry[]> | undefined;
  return {
    root: project.root,
    get tree() {
      return current.tree;
    },
    read(id) {
      return current.read(id);
    },
    linkTargets: () => current.linkTargets?.() ?? [],
    classifyLinkTarget: (path: string) =>
      current.classifyLinkTarget?.(path) ?? "UNREGISTERED",
    refresh() {
      pending ??= snapshot(false)
        .then((next) => {
          current = next;
          return next.tree;
        })
        .finally(() => {
          pending = undefined;
        });
      return pending;
    },
  };
}
