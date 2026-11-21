import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { it, expect } from "vitest";
import {
  loadFrontendPresentation,
  isFrontendRoute,
} from "../src/server/frontend-assets.js";
import { createDocumentService } from "../src/core/documents.js";
import { startDocumentationServer } from "../src/server/http.js";
it("serves exact packaged assets and app routes behind existing security without swallowing API/file errors", async () => {
  const { loadViewerPresentation } = (await import(
    new URL("../dist/viewer/assets.js", import.meta.url).href
  )) as typeof import("../src/viewer/assets.js");
  const root = await mkdtemp(join(tmpdir(), "kairn-app-"));
  await writeFile(join(root, "README.md"), "# Existing reader");
  const server = await startDocumentationServer(
    await createDocumentService(root),
    { port: 0, viewer: await loadViewerPresentation() },
  );
  try {
    for (const route of ["/app", "/app/settings/appearance", "/app/unknown"]) {
      const response = await fetch(server.url + route);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
      expect(await response.text()).toContain("/app/assets/");
      expect(response.headers.get("content-security-policy")).toContain(
        "script-src 'self'",
      );
      expect(response.headers.get("content-security-policy")).toContain(
        "img-src 'self'",
      );
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    const html = await (await fetch(server.url + "/app")).text();
    for (const asset of html.matchAll(
      /(?:src|href)="(\/app\/assets\/[^\"]+)"/g,
    )) {
      const response = await fetch(server.url + asset[1]);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toMatch(/javascript|css/);
    }
    for (const route of [
      "/app/assets/missing.js",
      "/app/index.html",
      "/api/missing",
      "/app/file.map",
    ])
      expect((await fetch(server.url + route)).status).toBe(404);
    for (const headers of [
      { Origin: "https://evil.test" },
      { "Sec-Fetch-Site": "cross-site" },
    ])
      expect((await fetch(server.url + "/app", { headers })).status).toBe(403);
    expect((await fetch(server.url + "/app", { method: "POST" })).status).toBe(
      405,
    );
    const reader = await fetch(server.url);
    expect(reader.headers.get("content-security-policy")).toContain(
      "img-src 'none'",
    );
    const presentation = await loadFrontendPresentation(
      new URL("../dist/frontend/", import.meta.url),
    );
    const logos = [...presentation.assets].filter(([name]) =>
      name.endsWith(".svg"),
    );
    expect(logos).toHaveLength(2);
    for (const [name, asset] of logos) {
      const response = await fetch(server.url + name);
      expect(response.headers.get("content-type")).toContain("image/svg+xml");
      expect(await response.text()).toBe(asset.body.toString());
    }
    expect(await (await fetch(server.url)).text()).toContain('id="document"');
  } finally {
    await server.close();
    await rm(root, { recursive: true, force: true });
  }
});
it("bounds packaged output and rejects maps, nested assets, oversized files and symlinks", async () => {
  const root = await mkdtemp(join(tmpdir(), "kairn-assets-"));
  const url = pathToFileURL(root + "/");
  try {
    await mkdir(join(root, "assets"));
    await writeFile(join(root, "index.html"), "<html></html>");
    const asset = join(root, "assets", "entry-123.js");
    await writeFile(asset, "export {};");
    expect((await loadFrontendPresentation(url)).assets.size).toBe(1);
    await writeFile(join(root, "assets", "local-123.woff2"), "font fixture");
    expect(
      (await loadFrontendPresentation(url)).assets.get(
        "/app/assets/local-123.woff2",
      )?.contentType,
    ).toBe("font/woff2");
    await rm(join(root, "assets", "local-123.woff2"));
    for (const name of ["entry.map", "nested"]) {
      await writeFile(join(root, "assets", name), "x");
      await expect(loadFrontendPresentation(url)).rejects.toThrow("type");
      await rm(join(root, "assets", name));
    }
    await writeFile(asset, Buffer.alloc(2_097_153));
    await expect(loadFrontendPresentation(url)).rejects.toThrow("asset");
    await rm(asset);
    if (process.platform !== "win32") {
      await symlink(join(root, "index.html"), asset);
      await expect(loadFrontendPresentation(url)).rejects.toThrow("asset");
      await rm(asset);
    }
    for (let i = 0; i < 33; i++)
      await writeFile(join(root, "assets", `a${i}.js`), "x");
    await expect(loadFrontendPresentation(url)).rejects.toThrow("Too many");
    for (const path of [
      "/api/unknown",
      "/app/../api",
      "/app/assets",
      "/app/%2e%2e",
      "/app/x.js",
    ])
      expect(isFrontendRoute(path)).toBe(false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
