// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, it, expect, vi } from "vitest";
import { App } from "../../src/frontend/app/App";
import type { ApiClient } from "../../src/frontend/lib/api/client";

const current = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Fixture project",
};

const otherProject = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Other project",
};

const docA = "a".repeat(64);
const docB = "b".repeat(64);

const client: ApiClient = {
  getContext: async () => current,
  getProjects: async () => [current, otherProject],
  getTree: async (projId) => ({
    tree: [
      {
        kind: "document",
        id: projId === otherProject.id ? docB : docA,
        path: projId === otherProject.id ? "docs/other.md" : "README.md",
        title: projId === otherProject.id ? "Other Doc" : "Fixture Readme",
      },
    ],
  }),
  getDocument: async (id) => ({
    id,
    path: id === docB ? "docs/other.md" : "README.md",
    title: id === docB ? "Other Doc" : "Fixture Readme",
    markdown: id === docB ? "# Other Doc" : "# Fixture Readme",
    revision: "rev-fixture-01",
    headings: [{ level: 2, title: "Section One", fragment: "section-one" }],
    diagnostics: [],
    html: "<p>Content</p>",
  }),
  resolveLink: async () => ({ kind: "external", href: "https://example.com" }),
  search: async () => ({ results: [], coverage: [] }),
};

function mount(path = "/", api = client) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App client={api} />
    </MemoryRouter>,
  );
}

afterEach(cleanup);
window.scrollTo = vi.fn();

it("redirects plain index to active project docs", async () => {
  mount("/");
  const heading = await screen.findByRole("heading", {
    name: "Fixture Readme",
  });
  expect(heading).toBeTruthy();
});

it("redirects legacy #<docId> bookmark to the specific document in active project", async () => {
  mount(`/#${docA}`);
  const heading = await screen.findByRole("heading", {
    name: "Fixture Readme",
  });
  expect(heading).toBeTruthy();
});

it("redirects legacy #<docId>/<heading> bookmark preserving heading fragment", async () => {
  mount(`/#${docA}/section-one`);
  const heading = await screen.findByRole("heading", {
    name: "Fixture Readme",
  });
  expect(heading).toBeTruthy();
});

it("redirects project-scoped #p/<projectId>/<docId>/<heading> to the target project", async () => {
  mount(`/#p/${otherProject.id}/${docB}/section-one`);
  const heading = await screen.findByRole("heading", { name: "Other Doc" });
  expect(heading).toBeTruthy();
});

it("displays safe alert when project-scoped bookmark targets an unregistered project", async () => {
  const missingProjectId = "33333333-3333-4333-8333-333333333333";
  mount(`/#p/${missingProjectId}/${docA}/heading`);
  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toContain("Project unavailable");
  expect(screen.queryByRole("heading", { name: "Fixture Readme" })).toBeNull();
});

it("displays safe alert for malformed or invalid document IDs", async () => {
  mount("/#not-a-valid-hash");
  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toContain("Invalid document identifier");
});

it("displays safe alert for malformed URI encoding in bookmark", async () => {
  mount(`/#${docA}/%zz-malformed`);
  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toContain("Invalid document identifier");
});
