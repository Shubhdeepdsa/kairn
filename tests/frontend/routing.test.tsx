// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, it, expect, vi } from "vitest";
import { App } from "../../src/frontend/app/App";
import type { ApiClient } from "../../src/frontend/lib/api/client";

const current = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Fixture project",
};

const defaultDocId = "a".repeat(64);

const client: ApiClient = {
  getContext: async () => current,
  getProjects: async () => [current],
  getTree: async () => ({
    tree: [
      {
        kind: "document",
        id: defaultDocId,
        path: "README.md",
        title: "Fixture Readme",
      },
    ],
  }),
  getDocument: async (id) => ({
    id,
    path: "README.md",
    title: "Fixture Readme",
    markdown: "# Fixture Readme",
    revision: "rev-fixture-01",
    headings: [],
    diagnostics: [],
    html: "<p>Fixture content</p>",
  }),
  resolveLink: async () => ({ kind: "external", href: "https://example.com" }),
};

function mount(path = "/", api = client) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App client={api} />
    </MemoryRouter>,
  );
}

afterEach(cleanup);

it("initializes from real-shaped API data and reuses one shell across routes", async () => {
  mount();
  await screen.findByRole("heading", { name: "React foundation" });
  expect(screen.getByText("Active project: Fixture project")).toBeTruthy();
  const header = screen.getByRole("banner");
  const brand = screen.getByRole("link", { name: "Kairn home" });
  expect(brand.getAttribute("href")).toBe("/");
  expect(
    screen.getByRole("img", { name: "Kairn" }).getAttribute("src"),
  ).toContain("kairn-wordmark-light.svg");
  expect(
    brand
      .querySelector('source[media="(max-width: 48rem)"]')
      ?.getAttribute("srcset"),
  ).toContain("kairn-mark-light.svg");
  fireEvent.click(
    screen.getByRole("link", { name: "Global settings contract" }),
  );
  await screen.findByRole("heading", {
    name: "Settings architecture contract",
  });
  expect(screen.getByRole("banner")).toBe(header);
  expect(screen.getAllByRole("main")).toHaveLength(1);
  fireEvent.click(
    screen.getByRole("button", { name: "Collapse Global settings navigation" }),
  );
  expect(
    screen.queryByRole("navigation", { name: "Global settings navigation" }),
  ).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Expand Global settings navigation" }),
  );
  fireEvent.click(screen.getByRole("link", { name: "Reading contract" }));
  expect(
    screen
      .getByRole("button", { name: "Collapse Global settings navigation" })
      .getAttribute("aria-expanded"),
  ).toBe("true");
});

it("uses the sidebar disclosure contract in project settings", async () => {
  mount(`/projects/${current.id}/settings/general`);
  await screen.findByRole("heading", {
    name: "Settings architecture contract",
  });
  fireEvent.click(
    screen.getByRole("button", {
      name: "Collapse Project settings navigation",
    }),
  );
  expect(
    screen.queryByRole("navigation", { name: "Project settings navigation" }),
  ).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Expand Project settings navigation" }),
  );
  expect(
    screen.getByRole("navigation", { name: "Project settings navigation" }),
  ).toBeTruthy();
});

it.each([
  ["/unknown", "Page not found"],
  ["/projects/invalid/docs", "Invalid project identifier."],
  [
    "/projects/22222222-2222-4222-8222-222222222222/docs",
    "Project is unavailable.",
  ],
  [`/projects/${current.id}/docs/bad`, "Invalid document identifier."],
])("handles route %s", async (path, message) => {
  mount(path);
  await screen.findByText(new RegExp(message!));
});

it("loads server-backed document tree and auto-selects default document at /docs", async () => {
  const treeDoc = {
    kind: "document" as const,
    id: "a".repeat(64),
    path: "README.md",
    title: "Project Readme",
  };
  const testClient: ApiClient = {
    ...client,
    getTree: async () => ({ tree: [treeDoc] }),
    getDocument: async (id) => ({
      id,
      path: "README.md",
      title: "Project Readme",
      markdown: "# Readme",
      revision: "rev-1",
      headings: [
        { level: 1, title: "Project Readme", fragment: "project-readme" },
      ],
      diagnostics: [],
      html: "<h1>Project Readme</h1>",
    }),
  };

  mount(`/projects/${current.id}/docs`, testClient);
  const headings = await screen.findAllByRole("heading", {
    name: "Project Readme",
  });
  expect(headings.length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText("Navigation tree")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Project Readme" })).toBeTruthy();
});

it("loads specific document when documentId is in the URL", async () => {
  const specificId = "b".repeat(64);
  const testClient: ApiClient = {
    ...client,
    getTree: async () => ({
      tree: [
        {
          kind: "document",
          id: specificId,
          path: "docs/spec.md",
          title: "Specification",
        },
      ],
    }),
    getDocument: async (id) => ({
      id,
      path: "docs/spec.md",
      title: "Specification",
      markdown: "# Specification",
      revision: "rev-2",
      headings: [],
      diagnostics: [],
      html: "<p>Spec body</p>",
    }),
  };

  mount(`/projects/${current.id}/docs/${specificId}`, testClient);
  await screen.findByRole("heading", { name: "Specification" });
  expect(screen.getByText("spec.md")).toBeTruthy();
});

it("shows loading and retry errors, then recovers through the same provider", async () => {
  const getContext = vi
    .fn<ApiClient["getContext"]>()
    .mockRejectedValueOnce(new Error("private path"))
    .mockResolvedValue(current);
  mount("/", { ...client, getContext });
  expect(screen.getByRole("status").textContent).toContain("Loading");
  await screen.findByRole("alert");
  expect(screen.getByRole("alert").textContent).not.toContain("private path");
  fireEvent.click(screen.getByRole("button", { name: "Retry connection" }));
  await screen.findByRole("heading", { name: "React foundation" });
});

it("aborts pending startup reads on unmount and ignores their late completion", async () => {
  let finish: ((value: typeof current) => void) | undefined;
  let signal: AbortSignal | undefined;
  const view = mount("/", {
    ...client,
    getContext: (input) => {
      signal = input;
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
  });
  expect(signal?.aborted).toBe(false);
  view.unmount();
  expect(signal?.aborted).toBe(true);
  finish?.(current);
});
