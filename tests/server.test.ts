import { request } from "node:http";
import { connect } from "node:net";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDocumentService } from "../src/core/documents.js";
import { startDocumentationServer } from "../src/server/http.js";
import type { RunningServer } from "../src/server/http.js";
const roots: string[] = [];
const servers: RunningServer[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => s.close()));
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function fixture(): Promise<{
  server: RunningServer;
  id: string;
  root: string;
}> {
  const root = await mkdtemp(join(tmpdir(), "kairn-http-"));
  roots.push(root);
  await writeFile(join(root, "README.md"), "# Hello");
  const documents = await createDocumentService(root);
  const node = documents.tree[0];
  if (node?.kind !== "document") throw new Error("fixture");
  const server = await startDocumentationServer(documents, { port: 0 });
  servers.push(server);
  return { server, id: node.id, root };
}
function raw(
  url: string,
  path: string,
  headers: Record<string, string> = {},
  method = "GET",
): Promise<{ status: number; body: string; headers: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const req = request(
      url + "/",
      { path, method, headers, agent: false },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (data) => {
          body += data;
        });
        response.on("end", () =>
          resolve({
            status: response.statusCode ?? 0,
            body,
            headers: response.headers,
          }),
        );
      },
    );
    req.on("error", reject);
    req.end();
  });
}
describe("localhost API", () => {
  it("starts on loopback, serves health/tree/content and closes idempotently", async () => {
    const { server, id } = await fixture();
    expect(server.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    expect((await raw(server.url, "/api/health")).body).toBe('{"status":"ok"}');
    const tree = await raw(server.url, "/api/tree");
    expect(tree.status).toBe(200);
    expect(JSON.parse(tree.body).tree[0].id).toBe(id);
    const doc = await raw(server.url, `/api/documents/${id}`);
    expect(JSON.parse(doc.body)).toMatchObject({
      id,
      path: "README.md",
      title: "README",
      markdown: "# Hello",
    });
    expect(doc.headers["access-control-allow-origin"]).toBeUndefined();
    expect(doc.headers["content-security-policy"]).toContain(
      "default-src 'none'",
    );
    expect(doc.body).not.toContain("canonicalPath");
    await server.close();
    await server.close();
    await expect(raw(server.url, "/api/health")).rejects.toThrow();
  });
  it("discovers new documents through the running API and removes deleted IDs", async () => {
    const { server, root, id } = await fixture();
    await mkdir(join(root, "nested"));
    await writeFile(join(root, "nested", "new.md"), "# New");
    const response = await raw(server.url, "/api/tree");
    expect(response.status).toBe(200);
    const added = JSON.parse(response.body).tree[0].children[0];
    expect(added.path).toBe("nested/new.md");
    expect(
      JSON.parse((await raw(server.url, `/api/documents/${added.id}`)).body)
        .markdown,
    ).toBe("# New");
    await rm(join(root, "README.md"));
    await raw(server.url, "/api/tree");
    expect((await raw(server.url, `/api/documents/${id}`)).status).toBe(404);
  });
  it("maps missing/invalid IDs and unsupported routes to structured errors", async () => {
    const { server } = await fixture();
    for (const [path, status] of [
      [`/api/documents/${"a".repeat(64)}`, 404],
      ["/api/documents/unknown", 400],
      ["/private.md", 404],
      ["/api/documents/", 400],
    ] as const) {
      const response = await raw(server.url, path);
      expect(response.status).toBe(status);
      expect(JSON.parse(response.body).error.code).toBeTruthy();
    }
  });
  it("rejects raw and encoded traversal, backslashes, absolute targets and oversized URLs", async () => {
    const { server } = await fixture();
    for (const path of [
      "/api/documents/../../secret.md",
      "/api/documents/%2e%2e%2fsecret.md",
      "/api/documents/%252e%252e",
      "/api/documents/..\\secret.md",
      "http://evil.test/api/tree",
      "/api/tree?root=/etc",
    ])
      expect((await raw(server.url, path)).status).toBe(400);
    expect((await raw(server.url, "/" + "a".repeat(2048))).status).toBe(414);
  });
  it("rejects hostile Host/Origin/fetch metadata and methods/bodies", async () => {
    const { server } = await fixture();
    for (const headers of [
      { Host: "evil.test" },
      { Origin: "https://evil.test" },
      { Origin: "null" },
      { "Sec-Fetch-Site": "cross-site" },
      { "Sec-Fetch-Site": "same-site" },
    ])
      expect((await raw(server.url, "/api/tree", headers)).status).toBe(403);
    expect(
      (
        await raw(server.url, "/api/tree", {
          Origin: server.url,
          "Sec-Fetch-Site": "same-origin",
        })
      ).status,
    ).toBe(200);
    expect((await raw(server.url, "/api/tree", {}, "POST")).status).toBe(405);
    expect(
      (await raw(server.url, "/api/tree", { "Content-Length": "1" })).status,
    ).toBe(413);
    expect(
      (await raw(server.url, "/api/tree", { "Transfer-Encoding": "chunked" }))
        .status,
    ).toBe(413);
  });
  it("rejects oversized headers", async () => {
    const { server } = await fixture();
    const response = await raw(server.url, "/api/tree", {
      "X-Large": "a".repeat(9000),
    });
    expect(response.status).toBe(400);
    expect(JSON.parse(response.body).error.code).toBe("INVALID_REQUEST");
  });
  it("reports port conflicts and invalid ports", async () => {
    const { server } = await fixture();
    const documents = {
      tree: [],
      read: async (): Promise<never> => {
        throw new Error("unused");
      },
    };
    await expect(
      startDocumentationServer(documents, {
        port: Number(new URL(server.url).port),
      }),
    ).rejects.toThrow("already in use");
    await expect(
      startDocumentationServer(documents, { port: -1 }),
    ).rejects.toThrow("Port");
  });
  it("hides unexpected exception details", async () => {
    const server = await startDocumentationServer(
      {
        tree: [],
        read: async () => {
          throw new Error("/private/secret");
        },
      },
      { port: 0 },
    );
    servers.push(server);
    const response = await raw(server.url, `/api/documents/${"b".repeat(64)}`);
    expect(response.status).toBe(500);
    expect(response.body).not.toContain("/private");
  });
  it("bounds shutdown even with an unfinished connection", async () => {
    const { server } = await fixture();
    const url = new URL(server.url);
    const socket = connect(Number(url.port), url.hostname);
    socket.on("error", () => {});
    try {
      await new Promise<void>((resolve) => socket.once("connect", resolve));
      await server.close();
      await expect(raw(server.url, "/api/health")).rejects.toThrow();
    } finally {
      socket.destroy();
    }
  });
});

it("conditionally reads active content by revision and notices external saves", async () => {
  const { server, id, root } = await fixture();
  const path = `/api/documents/${id}`;
  const first = await raw(server.url, path);
  const etag = String(first.headers.etag);
  expect(etag).toMatch(/^"[a-f0-9]{64}"$/);
  const unchanged = await raw(server.url, path, { "If-None-Match": etag });
  expect(unchanged.status).toBe(304);
  expect(unchanged.body).toBe("");
  await writeFile(join(root, "README.md"), "# Edited externally");
  const changed = await raw(server.url, path, { "If-None-Match": etag });
  expect(changed.status).toBe(200);
  expect(changed.headers.etag).not.toBe(etag);
  expect(JSON.parse(changed.body).markdown).toContain("Edited");
});
