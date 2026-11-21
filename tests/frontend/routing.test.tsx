// @vitest-environment jsdom
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, it, expect, vi } from "vitest";
import { App } from "../../src/frontend/app/App";
import type { ApiClient } from "../../src/frontend/lib/api/client";
const current = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Fixture project",
};
const client: ApiClient = {
  getContext: async () => current,
  getProjects: async () => [current],
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
it("uses the same sidebar disclosure contract in workspace and project settings", async () => {
  mount(`/projects/${current.id}/docs`);
  await screen.findByRole("heading", {
    name: "Documentation workspace foundation",
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Collapse Workspace navigation" }),
  );
  expect(
    screen.queryByRole("navigation", { name: "Workspace navigation" }),
  ).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Expand Workspace navigation" }),
  );
  fireEvent.click(screen.getByRole("link", { name: "Project settings" }));
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
    screen.getByRole("navigation", { name: "Workspace navigation" }),
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
it("hands valid document IDs to the unchanged legacy URL contract", async () => {
  const id = "a".repeat(64);
  mount(`/projects/${current.id}/docs/${id}`);
  const link = await screen.findByRole("link", {
    name: "Open document in the working reader",
  });
  expect(link.getAttribute("href")).toBe(`/#p/${current.id}/${id}`);
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
  await waitFor(() => expect(screen.queryByRole("heading")).toBeNull());
});
