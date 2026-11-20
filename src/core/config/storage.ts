import { constants } from "node:fs";
import { lstat, mkdir, open, realpath, rename, rm } from "node:fs/promises";
import { dirname, isAbsolute, join, parse, resolve } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";
import type { z } from "zod";
import { ConfigError, validateConfig } from "./schema.js";

/** OS application-data location; explicit redirect is required in persistence tests. */
export function applicationDataDirectory(
  environment: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
  home: string = homedir(),
): string {
  if (environment.KAIRN_DATA_DIR) {
    if (!isAbsolute(environment.KAIRN_DATA_DIR))
      throw new ConfigError("INVALID", "KAIRN_DATA_DIR must be absolute.");
    return resolve(environment.KAIRN_DATA_DIR);
  }
  if (platform === "darwin")
    return join(home, "Library", "Application Support", "kairn");
  if (platform === "win32")
    return join(
      environment.LOCALAPPDATA || join(home, "AppData", "Local"),
      "kairn",
    );
  return join(
    environment.XDG_DATA_HOME && isAbsolute(environment.XDG_DATA_HOME)
      ? environment.XDG_DATA_HOME
      : join(home, ".local", "share"),
    "kairn",
  );
}
/** Reject symlink components for explicit storage/source paths; missing components may be allowed for writes. */
export async function assertRealPath(
  path: string,
  allowMissing = false,
): Promise<void> {
  const absolute = resolve(path);
  let current = parse(absolute).root;
  for (const part of absolute
    .slice(current.length)
    .split(/[\\/]/)
    .filter(Boolean)) {
    current = join(current, part);
    try {
      if ((await lstat(current)).isSymbolicLink())
        throw new ConfigError(
          "INVALID",
          "Symlink path components are not allowed.",
        );
    } catch (error) {
      if (allowMissing && isMissing(error)) return;
      throw error;
    }
  }
}
/** Whether an expected file is absent, without swallowing permission or parse failures. */
export function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

/** Bounded read; missing is null. Reject symlinks and non-files; preserve invalid bytes. */
export async function readJson<T>(
  file: string,
  schema: z.ZodType<T>,
): Promise<T | null> {
  try {
    // Canonicalize system aliases such as /tmp before enforcing descendant paths.
    const parent = await realpath(dirname(file));
    const target = join(parent, file.slice(dirname(file).length + 1));
    await assertRealPath(target);
    const info = await lstat(target);
    if (!info.isFile() || info.size > 1_048_576)
      throw new ConfigError(
        "INVALID",
        "Configuration must be a regular JSON file under 1 MiB.",
      );
    const handle = await open(
      target,
      constants.O_RDONLY |
        (process.platform === "win32" ? 0 : constants.O_NOFOLLOW),
    );
    try {
      const buffer = Buffer.alloc(1_048_577);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      if (bytesRead > 1_048_576)
        throw new ConfigError("INVALID", "Configuration exceeds 1 MiB.");
      let value: unknown;
      try {
        value = JSON.parse(buffer.toString("utf8", 0, bytesRead));
      } catch {
        throw new ConfigError(
          "INVALID",
          "Malformed configuration JSON. Existing file was preserved.",
        );
      }
      return validateConfig(schema, value);
    } finally {
      await handle.close();
    }
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}
const queues = new Map<string, Promise<unknown>>();
/**
 * Serialize within this process and lock cooperating writers. Validate before/after mutation;
 * fsync a sibling temp and rename without unlinking the destination. No stale-lock stealing.
 * @param expected - Optional exact prior JSON value for stale-update detection; null means create only.
 */
export async function updateJson<T>(
  file: string,
  schema: z.ZodType<T>,
  mutate: (current: T | null) => T | Promise<T>,
  expected?: T | null,
): Promise<T> {
  const key = resolve(file);
  const previous = queues.get(key) ?? Promise.resolve();
  const operation = previous
    .catch(() => {})
    .then(async () => {
      await mkdir(dirname(key), { recursive: true, mode: 0o700 });
      const parent = await realpath(dirname(key));
      const target = join(parent, key.slice(dirname(key).length + 1));
      await assertRealPath(target, true);
      const lock = target + ".lock";
      let handle;
      try {
        handle = await open(lock, "wx", 0o600);
      } catch {
        throw new ConfigError(
          "CONFLICT",
          "Configuration is locked by another writer. Inspect the sibling .lock file before retrying.",
        );
      }
      const temporary = target + "." + randomUUID() + ".tmp";
      try {
        const current = await readJson(target, schema);
        if (
          expected !== undefined &&
          JSON.stringify(current) !== JSON.stringify(expected)
        )
          throw new ConfigError(
            "CONFLICT",
            "Configuration changed since preview; reload and retry.",
          );
        const next = validateConfig(schema, await mutate(current));
        const text = JSON.stringify(next, null, 2) + "\n";
        if (Buffer.byteLength(text) > 1_048_576)
          throw new ConfigError("INVALID", "Configuration exceeds 1 MiB.");
        const temp = await open(temporary, "wx", 0o600);
        try {
          await temp.writeFile(text);
          await temp.sync();
        } finally {
          await temp.close();
        }
        if (
          JSON.stringify(await readJson(target, schema)) !==
          JSON.stringify(current)
        )
          throw new ConfigError(
            "CONFLICT",
            "Configuration changed during save; reload and retry.",
          );
        await rename(temporary, target);
        return next;
      } finally {
        await rm(temporary, { force: true });
        await handle.close();
        await rm(lock, { force: true });
      }
    });
  queues.set(key, operation);
  try {
    return await operation;
  } finally {
    if (queues.get(key) === operation) queues.delete(key);
  }
}
