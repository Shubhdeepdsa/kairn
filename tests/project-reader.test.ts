import { JSDOM } from "jsdom";
import { it, expect } from "vitest";
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
