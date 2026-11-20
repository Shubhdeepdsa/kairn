import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderMarkdown } from "../src/viewer/markdown.js";
import { mountViewer } from "../src/viewer/client.js";
import { startDocumentationServer } from "../src/server/http.js";
import type { RunningServer } from "../src/server/http.js";
const doms: JSDOM[] = [];
const servers: RunningServer[] = [];
afterEach(async () => {
  doms.splice(0).forEach((dom) => dom.window.close());
  vi.useRealTimers();
  await Promise.all(servers.splice(0).map((server) => server.close()));
});
function dom(): JSDOM {
  const value = new JSDOM(
    '<nav id="navigation"></nav><p id="source"></p><p id="status"></p><article id="document" tabindex="-1"></article>',
    { url: "http://127.0.0.1:4173/", pretendToBeVisual: true },
  );
  doms.push(value);
  return value;
}
const rootId = "a".repeat(64);
const nestedId = "b".repeat(64);
function fakeFetch(fail = false): typeof fetch {
  return async (input) => {
    const path = String(input);
    if (fail)
      return new Response(
        JSON.stringify({ error: { message: "Could not read docs" } }),
        { status: 403 },
      );
    if (path === "/api/tree")
      return Response.json({
        tree: [
          {
            kind: "directory",
            path: "guide",
            title: "guide",
            children: [
              {
                kind: "document",
                path: "guide/start.md",
                title: "start",
                id: nestedId,
              },
            ],
          },
          { kind: "document", path: "README.md", title: "README", id: rootId },
        ],
      });
    const nested = path.endsWith(nestedId);
    return Response.json({
      html: renderMarkdown(
        nested
          ? "# Nested\n\n[Home](../README.md)"
          : "# Home\n\n[Next](guide/start.md)",
      ),
    });
  };
}
async function until(
  document: Document,
  predicate: () => boolean,
): Promise<void> {
  if (predicate()) return;
  await new Promise<void>((resolve) => {
    const observer = new document.defaultView!.MutationObserver(() => {
      if (predicate()) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
  });
}
describe("safe Markdown", () => {
  it("renders headings, lists, tables, links and fenced code", () => {
    const html = renderMarkdown(
      "# Title\n\n- Item\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n```js\nconst a = 1;\n```\n\n[Web](https://example.com)",
    );
    expect(html).toContain('<h1 id="title">');
    expect(html).toContain("<ul>");
    expect(html).toContain("<table>");
    expect(html).toContain('<code class="language-js">');
    expect(html).toContain('rel="noopener noreferrer"');
  });
  it("escapes raw HTML, blocks unsafe schemes and never loads images", () => {
    const html = renderMarkdown(
      "<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[x](javascript:alert%281%29) [x](data:text/html,hello) [x](vbscript:evil) [x](file:///etc/passwd) [x](//evil.test)\n\n![tracking](https://evil.test/pixel.png)\n\n```html\n<script>evil()</script>\n```",
    );
    const value = new JSDOM(html);
    doms.push(value);
    expect(
      value.window.document.querySelectorAll("script,img,iframe,object,embed"),
    ).toHaveLength(0);
    expect(value.window.document.querySelectorAll("a")).toHaveLength(0);
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("[Image: tracking]");
  });
});
describe("browser navigation", () => {
  it("shows nested navigation, readable content and current-document state", async () => {
    const value = dom();
    const document = value.window.document;
    await mountViewer(document, fakeFetch());
    expect(document.querySelector("details summary")?.textContent).toBe(
      "guide",
    );
    expect(document.querySelector("h1")?.textContent).toBe("Home");
    expect(document.querySelector("[aria-current=page]")?.textContent).toBe(
      "README",
    );
    (document.querySelector("#document a") as HTMLAnchorElement).click();
    await until(
      document,
      () => document.querySelector("h1")?.textContent === "Nested",
    );
    expect(document.getElementById("source")?.textContent).toBe(
      "guide/start.md",
    );
    expect(document.querySelector("[aria-current=page]")?.textContent).toBe(
      "start",
    );
    (document.querySelector("#document a") as HTMLAnchorElement).click();
    await until(
      document,
      () => document.querySelector("h1")?.textContent === "Home",
    );
    (
      document.querySelector(
        `[data-document="${nestedId}"]`,
      ) as HTMLAnchorElement
    ).click();
    await until(
      document,
      () => document.querySelector("h1")?.textContent === "Nested",
    );
  });
  it("shows loading while content is pending and labels filenames as text", async () => {
    const document = dom().window.document;
    let finish!: (response: Response) => void;
    let started!: () => void;
    const requested = new Promise<void>((resolve) => {
      started = resolve;
    });
    const pending = new Promise<Response>((resolve) => {
      finish = resolve;
    });
    const fetcher: typeof fetch = async (input) => {
      if (String(input) === "/api/tree")
        return Response.json({
          tree: [
            {
              kind: "document",
              id: rootId,
              path: "evil.md",
              title: "<img src=x onerror=alert(1)>",
            },
          ],
        });
      started();
      return pending;
    };
    const mounting = mountViewer(document, fetcher);
    await requested;
    expect(document.getElementById("status")?.textContent).toBe(
      "Loading document…",
    );
    expect(document.getElementById("document")?.getAttribute("aria-busy")).toBe(
      "true",
    );
    expect(document.querySelector("nav img")).toBeNull();
    finish(Response.json({ html: renderMarkdown("# Safe") }));
    await mounting;
    expect(document.querySelector("h1")?.textContent).toBe("Safe");
    expect(document.getElementById("document")?.hasAttribute("aria-busy")).toBe(
      false,
    );
  });
  it("handles empty roots, failed API calls and stale bookmarks", async () => {
    const empty = dom().window.document;
    await mountViewer(empty, async () => Response.json({ tree: [] }));
    expect(empty.getElementById("status")?.textContent).toContain(
      "No Markdown",
    );
    const failed = dom().window.document;
    await mountViewer(failed, fakeFetch(true));
    expect(failed.getElementById("status")?.textContent).toContain(
      "Could not read docs",
    );
    const stale = dom();
    stale.window.location.hash = "unknown";
    await mountViewer(stale.window.document, fakeFetch());
    expect(
      stale.window.document.getElementById("status")?.textContent,
    ).toContain("not found");
  });
  it("exposes loading then a document-read error without executing content", async () => {
    const document = dom().window.document;
    const fetcher: typeof fetch = async (input) =>
      String(input) === "/api/tree"
        ? fakeFetch()(input)
        : Response.json(
            { error: { message: "Document vanished" } },
            { status: 404 },
          );
    await mountViewer(document, fetcher);
    expect(document.getElementById("status")?.textContent).toBe(
      "Document vanished",
    );
    expect(document.getElementById("document")?.innerHTML).toBe("");
  });
  it("automatically adds nested documents while preserving the selection, content and collapsed folders", async () => {
    vi.useFakeTimers();
    const document = dom().window.document;
    const extra = {
      kind: "document",
      id: "c".repeat(64),
      path: "guide/new.md",
      title: "new",
    };
    let added = false;
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const response = await fakeFetch()(input);
      if (String(input) !== "/api/tree") return response;
      const data = await response.json();
      if (added) data.tree[0].children.push(extra);
      return Response.json(data);
    });
    const dispose = await mountViewer(document, fetcher);
    const article = document.getElementById("document")!;
    const content = article.firstChild;
    (document.querySelector("details") as HTMLDetailsElement).open = false;
    added = true;
    await vi.advanceTimersByTimeAsync(2000);
    expect(
      document.querySelector(`[data-document="${extra.id}"]`)?.textContent,
    ).toBe("new");
    expect(document.querySelector("[aria-current=page]")?.textContent).toBe(
      "README",
    );
    expect(article.firstChild).toBe(content);
    expect((document.querySelector("details") as HTMLDetailsElement).open).toBe(
      false,
    );
    const count = fetcher.mock.calls.length;
    dispose();
    await vi.advanceTimersByTimeAsync(6000);
    expect(fetcher.mock.calls.length).toBe(count);
  });
  it("updates an initially empty root and falls back safely when the selected document disappears", async () => {
    vi.useFakeTimers();
    const document = dom().window.document;
    const entry = {
      kind: "document",
      id: rootId,
      path: "README.md",
      title: "README",
    };
    let tree: object[] = [];
    const fetcher: typeof fetch = async (input) =>
      String(input) === "/api/tree"
        ? Response.json({ tree })
        : fakeFetch()(input);
    await mountViewer(document, fetcher);
    tree = [entry];
    await vi.advanceTimersByTimeAsync(2000);
    expect(document.querySelector("h1")?.textContent).toBe("Home");
    tree = [
      { ...entry, id: nestedId, path: "replacement.md", title: "replacement" },
    ];
    await vi.advanceTimersByTimeAsync(2000);
    expect(document.querySelector("[aria-current=page]")?.textContent).toBe(
      "replacement",
    );
    tree = [];
    await vi.advanceTimersByTimeAsync(2000);
    expect(document.querySelector("h1")).toBeNull();
    expect(document.getElementById("status")?.textContent).toContain(
      "No Markdown",
    );
  });
  it("retries refresh failures and pauses while the page is hidden", async () => {
    vi.useFakeTimers();
    const value = dom();
    const document = value.window.document;
    let fail = false;
    const fetcher = vi.fn<typeof fetch>(async (input) =>
      fail
        ? Response.json(
            { error: { message: "temporarily unavailable" } },
            { status: 503 },
          )
        : fakeFetch()(input),
    );
    await mountViewer(document, fetcher);
    fail = true;
    await vi.advanceTimersByTimeAsync(2000);
    expect(document.getElementById("status")?.textContent).toContain(
      "temporarily unavailable",
    );
    expect(document.querySelector("h1")?.textContent).toBe("Home");
    fail = false;
    await vi.advanceTimersByTimeAsync(2000);
    expect(document.getElementById("status")?.textContent).toBe("");
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new value.window.Event("visibilitychange"));
    const count = fetcher.mock.calls.length;
    await vi.advanceTimersByTimeAsync(6000);
    expect(fetcher.mock.calls.length).toBe(count);
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new value.window.Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetcher.mock.calls.length).toBeGreaterThan(count);
    value.window.dispatchEvent(new value.window.Event("pagehide"));
    const closed = fetcher.mock.calls.length;
    await vi.advanceTimersByTimeAsync(6000);
    expect(fetcher.mock.calls.length).toBe(closed);
  });
  it("resolves cross-source links without collisions between identical file titles", async () => {
    const document = dom().window.document;
    const fetcher: typeof fetch = async (input) =>
      String(input) === "/api/tree"
        ? Response.json({
            tree: [
              {
                kind: "document",
                id: rootId,
                path: "README.md",
                title: "README",
                sourceId: "primary",
                projectPath: "docs/README.md",
              },
              {
                kind: "directory",
                path: "extra",
                title: ".github/README.md",
                children: [
                  {
                    kind: "document",
                    id: nestedId,
                    path: "README.md",
                    title: "README",
                    sourceId: "extra",
                    projectPath: ".github/README.md",
                  },
                ],
              },
            ],
          })
        : Response.json({
            html: renderMarkdown(
              String(input).endsWith(rootId)
                ? "# Primary\n\n[Extra](../.github/README.md)"
                : "# Extra",
            ),
          });
    await mountViewer(document, fetcher);
    expect(document.querySelector("h1")?.textContent).toBe("Primary");
    (document.querySelector("article a") as HTMLAnchorElement).click();
    await until(
      document,
      () => document.querySelector("h1")?.textContent === "Extra",
    );
    expect(
      document
        .querySelector("[aria-current=page]")
        ?.getAttribute("data-document"),
    ).toBe(nestedId);
  });
  it("serves packaged viewer assets and rendered API content under CSP", async () => {
    // Source tests load the compiled module so asset resolution matches installed packages.
    const { loadViewerPresentation: loadBuilt } = (await import(
      new URL("../dist/viewer/assets.js", import.meta.url).href
    )) as typeof import("../src/viewer/assets.js");
    const viewer = await loadBuilt();
    const server = await startDocumentationServer(
      {
        tree: [],
        read: async (id) => ({
          id,
          path: "note.md",
          canonicalPath: "/not-exposed",
          title: "note",
          markdown: "# Actual Markdown",
        }),
      },
      { port: 0, viewer },
    );
    servers.push(server);
    const page = await fetch(server.url);
    expect(await page.text()).toContain("◇ Kairn");
    expect(page.headers.get("content-security-policy")).toContain(
      "script-src 'self'",
    );
    expect(await (await fetch(`${server.url}/viewer.js`)).text()).toContain(
      "mountViewer",
    );
    expect(await (await fetch(`${server.url}/viewer.css`)).text()).toContain(
      "@media",
    );
    expect(
      (await (await fetch(`${server.url}/api/documents/${rootId}`)).json())
        .html,
    ).toContain('<h1 id="actual-markdown">Actual Markdown</h1>');
  });
});
