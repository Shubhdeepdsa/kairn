import { access, lstat, mkdir, realpath, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { join, parse, resolve } from "node:path";

/** A read-only snapshot; applying always revalidates it against disk. */
export interface InitializationPlan {
  readonly root: string;
  readonly action: "create" | "reuse";
  readonly device: number;
  readonly inode: number;
}

/** The actual outcome; existing directory contents are never changed. */
export interface InitializationResult {
  readonly root: string;
  readonly outcome: "created" | "reused" | "declined";
}

function missing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

async function validateRoot(input: string): Promise<string> {
  const absolute = resolve(input);
  if (absolute === parse(absolute).root)
    throw new Error("Choose a project directory, not a filesystem root.");
  const entry = await lstat(absolute);
  if (entry.isSymbolicLink() || !entry.isDirectory())
    throw new Error("Project must be a real directory, not a symlink or file.");
  const root = await realpath(absolute);
  if (root === parse(root).root)
    throw new Error("Choose a project directory, not a filesystem root.");
  await access(root, constants.R_OK | constants.X_OK);
  return root;
}

/**
 * Discover only the direct docs child without scanning or writing.
 * @param directory - Existing project directory; direct symlink roots are rejected.
 * @returns The canonical docs path, or null when absent.
 * @throws If the root is inaccessible or docs is a symlink or non-directory.
 */
export async function discoverDocumentationRoot(
  directory: string,
): Promise<string | null> {
  const root = await validateRoot(directory);
  const docs = join(root, "docs");
  try {
    const entry = await lstat(docs);
    if (entry.isSymbolicLink() || !entry.isDirectory())
      throw new Error(
        "docs must be a real directory; move the conflicting file or symlink first.",
      );
    await access(docs, constants.R_OK | constants.X_OK);
    return docs;
  } catch (error) {
    if (missing(error)) return null;
    throw error;
  }
}

/** Compute a preview without mutations; no recursive discovery or Git requirement. */
export async function planInitialization(
  directory: string,
): Promise<InitializationPlan> {
  const root = await validateRoot(directory);
  const action =
    (await discoverDocumentationRoot(root)) === null ? "create" : "reuse";
  if (action === "create") await access(root, constants.W_OK | constants.X_OK);
  const entry = await stat(root);
  return Object.freeze({ root, action, device: entry.dev, inode: entry.ino });
}

/**
 * Apply explicit consent, rechecking root identity and docs type before mkdir.
 * Creates only an empty docs directory, never overwriting files or adding to existing docs.
 * @param plan - Snapshot produced by planInitialization; stale or altered plans are rejected.
 * @param approved - False returns declined without accessing or changing disk.
 * @returns Actual create/reuse/decline outcome.
 * @throws For stale plans, conflicts, permissions or unexpected filesystem changes.
 */
export async function applyInitializationPlan(
  plan: InitializationPlan,
  approved: boolean,
): Promise<InitializationResult> {
  if (!approved) return { root: plan.root, outcome: "declined" };
  const current = await planInitialization(plan.root);
  if (
    current.root !== plan.root ||
    current.device !== plan.device ||
    current.inode !== plan.inode ||
    current.action !== plan.action
  )
    throw new Error("Project changed since preview; run init again.");
  if (current.action === "reuse")
    return { root: current.root, outcome: "reused" };
  await mkdir(join(current.root, "docs"));
  return { root: current.root, outcome: "created" };
}
