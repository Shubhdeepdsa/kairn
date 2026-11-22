import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { it, expect } from "vitest";
import {
  loadFrontendPresentation,
  isFrontendRoute,
  frontendAssetBudget,
} from "../src/server/frontend-assets.js";
import { createDocumentService } from "../src/core/documents.js";
import { startDocumentationServer } from "../src/server/http.js";
it("serves exact packaged assets and app routes behind existing security without swallowing API/file errors", async () => {
  const frontend = await loadFrontendPresentation();
  const root = await mkdtemp(join(tmpdir(), "kairn-app-"));
  await writeFile(join(root, "README.md"), "# Existing reader");
  const server = await startDocumentationServer(
    await createDocumentService(root),
    { port: 0, frontend },
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
    const redirect = await fetch(server.url, { redirect: "manual" });
    expect(redirect.status).toBe(302);
    expect(redirect.headers.get("location")).toBe("/app");
    expect(redirect.headers.get("content-security-policy")).toContain(
      "img-src 'none'",
    );
    const presentation = await loadFrontendPresentation(
      new URL("../dist/frontend/", import.meta.url),
    );
    const logos = [...presentation.assets].filter(([name]) =>
      name.endsWith(".svg"),
    );
    expect(logos).toHaveLength(4);
    for (const [name, asset] of logos) {
      const response = await fetch(server.url + name);
      expect(response.headers.get("content-type")).toContain("image/svg+xml");
      expect(await response.text()).toBe(asset.body.toString());
    }
    expect(await (await fetch(server.url)).text()).toContain('id="root"');
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
it("verifies the production frontend build adheres to the configured asset budget", async () => {
  const presentation = await loadFrontendPresentation(
    new URL("../dist/frontend/", import.meta.url),
  );
  expect(presentation.assets.size).toBeGreaterThan(0);
  expect(presentation.assets.size).toBeLessThanOrEqual(
    frontendAssetBudget.maxAssetCount,
  );
  const pageBytes = Buffer.byteLength(presentation.page);
  expect(pageBytes).toBeLessThanOrEqual(frontendAssetBudget.maxIndexHtmlBytes);
  let totalBytes = pageBytes;
  for (const [path, asset] of presentation.assets) {
    expect(
      asset.body.length,
      `Asset ${path} must not exceed ${frontendAssetBudget.maxAssetBytes} bytes`,
    ).toBeLessThanOrEqual(frontendAssetBudget.maxAssetBytes);
    totalBytes += asset.body.length;
  }
  expect(
    totalBytes,
    `Total presentation size (${totalBytes} B) must not exceed ${frontendAssetBudget.maxTotalBytes} bytes`,
  ).toBeLessThanOrEqual(frontendAssetBudget.maxTotalBytes);
});
it("provides actionable diagnostics when asset budget limits are exceeded", async () => {
  const root = await mkdtemp(join(tmpdir(), "kairn-budget-diag-"));
  const url = pathToFileURL(root + "/");
  try {
    await mkdir(join(root, "assets"));
    await writeFile(join(root, "index.html"), "<html></html>");
    await writeFile(join(root, "assets", "a1.js"), "x");
    await writeFile(join(root, "assets", "a2.js"), "y");
    await expect(
      loadFrontendPresentation(url, {
        ...frontendAssetBudget,
        maxAssetCount: 1,
      }),
    ).rejects.toThrow(
      "Too many frontend assets: 2 files found (budget limit: 1).",
    );
    await expect(
      loadFrontendPresentation(url, {
        ...frontendAssetBudget,
        maxAssetBytes: 0,
      }),
    ).rejects.toThrow("exceeds 0 bytes limit");
    await expect(
      loadFrontendPresentation(url, {
        ...frontendAssetBudget,
        maxTotalBytes: 5,
      }),
    ).rejects.toThrow(
      "Frontend presentation is too large: 14 bytes (budget limit: 5 bytes).",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
