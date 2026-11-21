import { expect, it, vi } from "vitest";
import { createApiClient } from "../../src/frontend/lib/api/client";
import type {
  TreeResponse,
  DocumentResponse,
  LinkResolution,
} from "../../src/frontend/lib/api/types";

const project = { id: "11111111-1111-4111-8111-111111111111", name: "Project" };
const docId = "a".repeat(64);

it("uses fixed same-origin GET routes, validates responses and passes cancellation", async () => {
  const fetcher = vi.fn<typeof fetch>(async (path) =>
    Response.json(
      String(path) === "/api/context" ? project : { projects: [project] },
    ),
  );
  const client = createApiClient(fetcher);
  const controller = new AbortController();
  expect(await client.getContext(controller.signal)).toEqual(project);
  expect(await client.getProjects()).toEqual([project]);
  expect(fetcher).toHaveBeenCalledWith("/api/context", {
    method: "GET",
    credentials: "same-origin",
    redirect: "error",
    signal: controller.signal,
  });
  expect(fetcher.mock.calls[1]?.[0]).toBe("/api/projects");
});

it("redacts HTTP/network failures and rejects malformed response shapes", async () => {
  for (const response of [
    Response.json({ id: "../private", name: "Bad" }),
    Response.json({ projects: null }),
    new Response("not json"),
    Response.json({ error: { message: "private path" } }, { status: 503 }),
  ]) {
    const client = createApiClient(async () => response);
    await expect(client.getContext()).rejects.not.toThrow("private path");
  }
  await expect(
    createApiClient(async () => {
      throw new Error("private path");
    }).getContext(),
  ).rejects.toThrow("Local server is unavailable");
  await expect(
    createApiClient(async () =>
      Response.json({ projects: null }),
    ).getProjects(),
  ).rejects.toThrow("invalid application response");
});

it("preserves abort cancellation for effect cleanup", async () => {
  const controller = new AbortController();
  controller.abort();
  const error = new DOMException("Aborted", "AbortError");
  await expect(
    createApiClient(async () => {
      throw error;
    }).getContext(controller.signal),
  ).rejects.toBe(error);
});

it("fetches and validates tree responses for root and scoped projects", async () => {
  const treeData: TreeResponse = {
    tree: [
      {
        kind: "directory",
        path: "docs",
        title: "Docs",
        children: [
          {
            kind: "document",
            id: docId,
            path: "docs/readme.md",
            title: "Readme",
            sourceId: "source-1",
          },
        ],
      },
    ],
    warning: "Some warning",
  };

  const fetcher = vi.fn<typeof fetch>(async () => Response.json(treeData));
  const client = createApiClient(fetcher);

  const rootTree = await client.getTree();
  expect(rootTree).toEqual(treeData);
  expect(fetcher).toHaveBeenCalledWith(
    "/api/tree",
    expect.objectContaining({ method: "GET" }),
  );

  const projectTree = await client.getTree(project.id);
  expect(projectTree).toEqual(treeData);
  expect(fetcher).toHaveBeenCalledWith(
    `/api/projects/${project.id}/tree`,
    expect.objectContaining({ method: "GET" }),
  );

  // Invalid project ID rejection
  await expect(client.getTree("invalid-id")).rejects.toThrow(
    "invalid application response",
  );
});

it("fetches and validates document responses for root and scoped projects", async () => {
  const docData: DocumentResponse = {
    id: docId,
    path: "docs/guide.md",
    title: "Guide",
    markdown: "# Guide\nContent",
    revision: "rev-123",
    headings: [{ level: 1, title: "Guide", fragment: "guide" }],
    diagnostics: [
      {
        line: 5,
        column: 1,
        target: "bad.md",
        code: "MISSING",
        message: "Target missing",
      },
    ],
    html: "<h1>Guide</h1><p>Content</p>",
  };

  const fetcher = vi.fn<typeof fetch>(async () => Response.json(docData));
  const client = createApiClient(fetcher);

  const doc = await client.getDocument(docId);
  expect(doc).toEqual(docData);
  expect(fetcher).toHaveBeenCalledWith(
    `/api/documents/${docId}`,
    expect.objectContaining({ method: "GET" }),
  );

  const scopedDoc = await client.getDocument(docId, project.id);
  expect(scopedDoc).toEqual(docData);
  expect(fetcher).toHaveBeenCalledWith(
    `/api/projects/${project.id}/documents/${docId}`,
    expect.objectContaining({ method: "GET" }),
  );

  // Invalid document ID format rejection
  await expect(client.getDocument("short-id")).rejects.toThrow(
    "invalid application response",
  );
});

it("fetches and validates link resolution responses", async () => {
  const resolution: LinkResolution = {
    kind: "document",
    id: docId,
    fragment: "target-heading",
  };

  const fetcher = vi.fn<typeof fetch>(async () => Response.json(resolution));
  const client = createApiClient(fetcher);

  const res = await client.resolveLink(docId, "target.md#heading");
  expect(res).toEqual(resolution);
  expect(fetcher).toHaveBeenCalledWith(
    `/api/links/${docId}/${encodeURIComponent("target.md#heading")}`,
    expect.objectContaining({ method: "GET" }),
  );

  const scopedRes = await client.resolveLink(docId, "target.md", project.id);
  expect(scopedRes).toEqual(resolution);
  expect(fetcher).toHaveBeenCalledWith(
    `/api/projects/${project.id}/links/${docId}/${encodeURIComponent("target.md")}`,
    expect.objectContaining({ method: "GET" }),
  );

  const diagnosticRes: LinkResolution = {
    kind: "diagnostic",
    diagnostic: {
      code: "MISSING",
      message: "Destination is missing.",
      target: "nonexistent.md",
      documentId: docId,
    },
  };
  const diagFetcher = vi.fn<typeof fetch>(async () =>
    Response.json(diagnosticRes),
  );
  const diagClient = createApiClient(diagFetcher);
  const diagOutcome = await diagClient.resolveLink(docId, "nonexistent.md");
  expect(diagOutcome).toEqual(diagnosticRes);
});
