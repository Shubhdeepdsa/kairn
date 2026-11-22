import { lstat, readdir, open } from "node:fs/promises";

/** Resource and security bounds for packaged presentation assets. */
export interface FrontendAssetBudget {
  readonly maxAssetCount: number;
  readonly maxAssetBytes: number;
  readonly maxTotalBytes: number;
  readonly maxIndexHtmlBytes: number;
}

/** Default production presentation budget. */
export const frontendAssetBudget: FrontendAssetBudget = Object.freeze({
  maxAssetCount: 32,
  maxAssetBytes: 2_097_152, // 2 MiB
  maxTotalBytes: 8_388_608, // 8 MiB
  maxIndexHtmlBytes: 65_536, // 64 KiB
});

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
 * @param budget - Optional resource bounds; defaults to frontendAssetBudget.
 * @throws If output is absent, malformed or exceeds the fixed presentation limits.
 */
export async function loadFrontendPresentation(
  root = new URL(
    import.meta.url.includes("/src/server/")
      ? "../../dist/frontend/"
      : "../frontend/",
    import.meta.url,
  ),
  budget: FrontendAssetBudget = frontendAssetBudget,
): Promise<FrontendPresentation> {
  if (
    !(await lstat(root)).isDirectory() ||
    (await lstat(root)).isSymbolicLink()
  )
    throw new Error("Frontend build directory is invalid.");
  async function boundedFile(url: URL, limit: number): Promise<Buffer> {
    const info = await lstat(url);
    if (!info.isFile() || info.isSymbolicLink() || info.size > limit)
      throw new Error(
        `Invalid frontend asset: ${url.pathname} exceeds ${limit} bytes limit or is not a regular file.`,
      );
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
      if (length > limit)
        throw new Error(
          `Frontend asset exceeds its limit: ${length} bytes > ${limit} bytes.`,
        );
      return buffer.subarray(0, length);
    } finally {
      await file.close();
    }
  }
  const page = (
    await boundedFile(new URL("index.html", root), budget.maxIndexHtmlBytes)
  ).toString("utf8");
  const directory = new URL("assets/", root);
  if (
    !(await lstat(directory)).isDirectory() ||
    (await lstat(directory)).isSymbolicLink()
  )
    throw new Error("Invalid frontend asset directory.");
  const names = await readdir(directory);
  if (names.length > budget.maxAssetCount)
    throw new Error(
      `Too many frontend assets: ${names.length} files found (budget limit: ${budget.maxAssetCount}).`,
    );
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
    const body = await boundedFile(
      new URL(name, directory),
      budget.maxAssetBytes,
    );
    total += body.length;
    if (total > budget.maxTotalBytes)
      throw new Error(
        `Frontend presentation is too large: ${total} bytes (budget limit: ${budget.maxTotalBytes} bytes).`,
      );
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
