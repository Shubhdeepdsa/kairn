import { lstat, readdir, open } from "node:fs/promises";
/** Trusted packaged presentation, loaded once at startup; no request-time filesystem lookup. */
export interface FrontendPresentation {
  readonly page: string;
  readonly assets: ReadonlyMap<
    string,
    { readonly body: Buffer; readonly contentType: string }
  >;
}
/**
 * Preload only index.html and flat hashed JS/CSS/font/SVG outputs, bounded to 32 assets,
 * 2 MiB each and 8 MiB total. Symlinks, source maps and nested output are rejected.
 * @param root - Packaged build directory; explicit override is for fixture tests.
 * @throws If output is absent, malformed or exceeds the fixed presentation limits.
 */
export async function loadFrontendPresentation(
  root = new URL("../frontend/", import.meta.url),
): Promise<FrontendPresentation> {
  if (
    !(await lstat(root)).isDirectory() ||
    (await lstat(root)).isSymbolicLink()
  )
    throw new Error("Frontend build directory is invalid.");
  async function boundedFile(url: URL, limit: number): Promise<Buffer> {
    const info = await lstat(url);
    if (!info.isFile() || info.isSymbolicLink() || info.size > limit)
      throw new Error("Invalid frontend asset.");
    const file = await open(url, "r");
    try {
      const buffer = Buffer.alloc(limit + 1);
      let length = 0;
      while (length <= limit) {
        const { bytesRead } = await file.read(
          buffer,
          length,
          buffer.length - length,
          null,
        );
        if (!bytesRead) break;
        length += bytesRead;
      }
      if (length > limit) throw new Error("Frontend asset exceeds its limit.");
      return buffer.subarray(0, length);
    } finally {
      await file.close();
    }
  }
  const page = (
    await boundedFile(new URL("index.html", root), 65_536)
  ).toString("utf8");
  const directory = new URL("assets/", root);
  if (
    !(await lstat(directory)).isDirectory() ||
    (await lstat(directory)).isSymbolicLink()
  )
    throw new Error("Invalid frontend asset directory.");
  const names = await readdir(directory);
  if (names.length > 32) throw new Error("Too many frontend assets.");
  const assets = new Map<string, { body: Buffer; contentType: string }>();
  let total = Buffer.byteLength(page);
  for (const name of names) {
    if (
      [
        "syne-LICENSE.txt",
        "plus-jakarta-sans-LICENSE.txt",
        "ibm-plex-mono-LICENSE.txt",
      ].includes(name)
    )
      continue;
    if (!/^[A-Za-z0-9_-]+\.(?:js|css|woff2|svg)$/.test(name))
      throw new Error("Unexpected frontend asset type.");
    const body = await boundedFile(new URL(name, directory), 2_097_152);
    total += body.length;
    if (total > 8_388_608)
      throw new Error("Frontend presentation is too large.");
    assets.set("/app/assets/" + name, {
      body,
      contentType: name.endsWith(".js")
        ? "text/javascript"
        : name.endsWith(".woff2")
          ? "font/woff2"
          : name.endsWith(".svg")
            ? "image/svg+xml"
            : "text/css",
    });
  }
  if (!assets.size) throw new Error("Frontend build has no assets.");
  return { page, assets };
}
/** Application namespace only; unknown app pages render the router's not-found view. Files/APIs never use SPA fallback. */
export function isFrontendRoute(path: string): boolean {
  return (
    /^\/app(?:\/[A-Za-z0-9_-]+)*\/?$/.test(path) &&
    !path.startsWith("/app/assets")
  );
}
