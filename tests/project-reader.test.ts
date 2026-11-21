import { JSDOM } from "jsdom";
import { it, expect, vi } from "vitest";
import { mountViewer } from "../src/viewer/client.js";
import { readerHash } from "../src/viewer/navigation.js";
const a = "11111111-1111-4111-8111-111111111111",
  b = "22222222-2222-4222-8222-222222222222";
const docA = "a".repeat(64),
  docB = "b".repeat(64);
it("restores cross-project deep links and real history events through explicit scoped APIs", async () => {
  const dom = new JSDOM(
    '<html data-kairn-application="true"><body><nav id="navigation"></nav><p id="source"></p><p id="status"></p><article id="document"></article></body></html>',
    {
      url: "http://127.0.0.1:4173/" + readerHash(docB, "configuration", b),
      pretendToBeVisual: true,
    },
  );
  const paths: string[] = [];
  const fetcher: typeof fetch = async (input) => {
    const path = String(input);
    paths.push(path);
    if (path === "/api/context") return Response.json({ id: a, name: "A" });
    if (path === "/api/projects")
      return Response.json({
        projects: [
          { id: a, name: "A" },
          { id: b, name: "B" },
        ],
      });
    const isB = path.includes(b);
    const id = isB ? docB : docA;
    if (path.endsWith("/tree"))
      return Response.json({
        tree: [
          { kind: "document", id, path: "README.md", title: isB ? "B" : "A" },
        ],
      });
    return Response.json({
      html: `<h1 id="configuration">${isB ? "Project B" : "Project A"}</h1>`,
      headings: [
        { level: 1, title: "Configuration", fragment: "configuration" },
      ],
      diagnostics: [],
    });
  };
  const cleanup = await mountViewer(dom.window.document, fetcher);
  try {
    expect(dom.window.document.getElementById("document")!.textContent).toBe(
      "Project B",
    );
    expect(paths).toContain(`/api/projects/${b}/tree`);
    dom.window.history.pushState(null, "", readerHash(docA));
    dom.window.dispatchEvent(new dom.window.PopStateEvent("popstate"));
    for (
      let i = 0;
      i < 20 &&
      dom.window.document.getElementById("document")!.textContent !==
        "Project A";
      i++
    )
      await new Promise((r) => setImmediate(r));
    expect(dom.window.document.getElementById("document")!.textContent).toBe(
      "Project A",
    );
    expect(dom.window.location.hash).toBe(readerHash(docA));
  } finally {
    cleanup();
    dom.window.close();
  }
});

it("dismisses empty search, switches projects with arrows/Enter, and keeps the reader on an empty-project error", async () => {
  const c = "33333333-3333-4333-8333-333333333333";
  const dom = new JSDOM(
    '<html data-kairn-application="true"><body><button id="search-open">Search</button><nav id="navigation"></nav><p id="source"></p><p id="status"></p><article id="document" tabindex="-1"></article></body></html>',
    { url: "http://127.0.0.1:4173", pretendToBeVisual: true },
  );
  const document = dom.window.document;
  const fetcher: typeof fetch = async (input) => {
    const path = String(input);
    if (path === "/api/context") return Response.json({ id: a, name: "A" });
    if (path === "/api/projects")
      return Response.json({
        projects: [
          { id: a, name: "A" },
          { id: b, name: "B" },
          { id: c, name: "C empty" },
        ],
      });
    if (path === `/api/projects/${c}/tree`) return Response.json({ tree: [] });
    const isB = path.includes(b);
    const id = isB ? docB : docA;
    if (path.endsWith("/tree"))
      return Response.json({
        tree: [
          { kind: "document", id, path: "README.md", title: isB ? "B" : "A" },
        ],
      });
    return Response.json({
      html: `<h1>${isB ? "Project B" : "Project A"}</h1>`,
      headings: [],
      diagnostics: [],
    });
  };
  const cleanup = await mountViewer(document, fetcher);
  const key = (value: string) =>
    document.getElementById("search-query")!.dispatchEvent(
      new dom.window.KeyboardEvent("keydown", {
        key: value,
        bubbles: true,
        cancelable: true,
      }),
    );
  const settle = async (predicate: () => boolean) => {
    for (let i = 0; i < 30 && !predicate(); i++)
      await new Promise((r) => setImmediate(r));
    expect(predicate()).toBe(true);
  };
  try {
    const originalHash = dom.window.location.hash;
    document.getElementById("search-open")!.click();
    key("Enter");
    expect(
      (document.querySelector(".search-overlay") as HTMLElement).hidden,
    ).toBe(true);
    expect(document.querySelector("article h1")!.textContent).toBe("Project A");
    expect(dom.window.location.hash).toBe(originalHash);
    document.getElementById("search-open")!.click();
    (document.querySelector(".search-chip") as HTMLButtonElement).click();
    await settle(() => document.querySelectorAll("[role=option]").length === 3);
    key("ArrowDown");
    key("Enter");
    await settle(
      () => document.querySelector("article h1")?.textContent === "Project B",
    );
    expect(dom.window.location.hash).toBe(readerHash(docB, "", b));
    expect(
      (document.querySelector(".search-overlay") as HTMLElement).hidden,
    ).toBe(true);
    document.getElementById("search-open")!.click();
    expect(document.querySelector(".search-chip")!.textContent).toContain("B");
    key("Enter");
    expect(document.querySelector("article h1")!.textContent).toBe("Project B");
    const beforeEmpty = dom.window.location.hash;
    document.getElementById("search-open")!.click();
    (document.querySelector(".search-chip") as HTMLButtonElement).click();
    await settle(() => document.querySelectorAll("[role=option]").length === 3);
    key("ArrowUp");
    key("Enter");
    await settle(
      () =>
        document
          .getElementById("status")!
          .textContent?.includes("no readable Markdown") ?? false,
    );
    expect(document.querySelector("article h1")!.textContent).toBe("Project B");
    expect(dom.window.location.hash).toBe(beforeEmpty);
  } finally {
    cleanup();
    dom.window.close();
  }
});

it.each(["", "@A"])(
  "preserves a nondefault document when reselecting the active project with %j",
  async (query) => {
    const architecture = "c".repeat(64);
    const dom = new JSDOM(
      '<html data-kairn-application="true"><body><button id="search-open">Search</button><nav id="navigation"></nav><p id="source"></p><p id="status"></p><article id="document" tabindex="-1"></article></body></html>',
      {
        url: "http://127.0.0.1:4173/" + readerHash(architecture, "design"),
        pretendToBeVisual: true,
      },
    );
    const document = dom.window.document;
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const path = String(input);
      if (path === "/api/context") return Response.json({ id: a, name: "A" });
      if (path === "/api/projects")
        return Response.json({ projects: [{ id: a, name: "A" }] });
      if (path.endsWith("/tree"))
        return Response.json({
          tree: [
            { kind: "document", id: docA, path: "README.md", title: "A" },
            {
              kind: "document",
              id: architecture,
              path: "docs/architecture.md",
              title: "Architecture",
            },
          ],
        });
      return Response.json({
        html: path.endsWith(architecture)
          ? '<h1 id="design">Architecture</h1>'
          : "<h1>Default</h1>",
        headings: [],
        diagnostics: [],
      });
    });
    const cleanup = await mountViewer(document, fetcher);
    try {
      const heading = document.querySelector("article h1");
      expect(heading?.textContent).toBe("Architecture");
      Object.defineProperty(dom.window, "scrollY", {
        value: 480,
        configurable: true,
      });
      const scrollTo = vi.fn();
      dom.window.scrollTo = scrollTo;
      const beforeHash = dom.window.location.hash;
      const beforeHistory = dom.window.history.length;
      document.getElementById("search-open")!.click();
      (document.querySelector(".search-chip") as HTMLButtonElement).click();
      await new Promise((resolve) => setImmediate(resolve));
      const input = document.getElementById("search-query") as HTMLInputElement;
      input.value = query;
      input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
      expect(document.querySelectorAll("[role=option]")).toHaveLength(1);
      fetcher.mockClear();
      input.dispatchEvent(
        new dom.window.KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        }),
      );
      await new Promise((resolve) => setImmediate(resolve));
      expect(
        (document.querySelector(".search-overlay") as HTMLElement).hidden,
      ).toBe(true);
      expect(document.querySelector("article h1")).toBe(heading);
      expect(dom.window.location.hash).toBe(beforeHash);
      expect(dom.window.history.length).toBe(beforeHistory);
      expect(dom.window.scrollY).toBe(480);
      expect(scrollTo).not.toHaveBeenCalled();
      expect(fetcher).not.toHaveBeenCalled();
    } finally {
      cleanup();
      dom.window.close();
    }
  },
);
