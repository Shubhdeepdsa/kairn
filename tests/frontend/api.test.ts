import { expect, it, vi } from "vitest";
import { createApiClient } from "../../src/frontend/lib/api/client";
const project = { id: "11111111-1111-4111-8111-111111111111", name: "Project" };
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
