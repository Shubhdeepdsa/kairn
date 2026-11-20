import { constants } from "node:fs";
import { lstat, open, opendir, realpath } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, parse, resolve } from "node:path";

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
  read(id: string): Promise<DocumentContent>;
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
        if (++visited > bounds.entries)
          fail("LIMIT_EXCEEDED", "Documentation scan entry limit exceeded.");
        if (child.name.startsWith(".")) continue;
        const sourcePath = relative ? `${relative}/${child.name}` : child.name;
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
          if (files.size >= bounds.documents)
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
    return Object.freeze({ root, tree, read });
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
