import { JSDOM } from "jsdom";
import { afterEach, expect, it, vi } from "vitest";
import { mountSearchPalette } from "../src/viewer/search-palette.js";
const a = { id: "11111111-1111-4111-8111-111111111111", name: "Reader" },
  b = { id: "22222222-2222-4222-8222-222222222222", name: "Marketing Backend" };
afterEach(() => vi.useRealTimers());
it("runs contextual shortcut → Backspace global → @project preserving query → keyboard result navigation with safe accessible DOM", async () => {
  vi.useFakeTimers();
  const dom = new JSDOM(
    '<button id="search-open">Search</button><main>Reader</main>',
    { pretendToBeVisual: true, url: "http://127.0.0.1:4173" },
  );
  const document = dom.window.document;
  const trigger = document.getElementById("search-open")!;
  trigger.focus();
  const navigate = vi.fn(async () => {});
  const calls: string[] = [];
  const fetcher: typeof fetch = async (input) => {
    const path = String(input);
    calls.push(path);
    if (path === "/api/projects") return Response.json({ projects: [a, b] });
    return Response.json({
      results: [
        {
          projectId: b.id,
          documentId: "b".repeat(64),
          fragment: "configuration",
          projectName: b.name,
          documentTitle: "Authentication",
          sourcePath: "docs/architecture.md",
          heading: "Configuration",
          snippet: "<img src=x onerror=alert(1)> safe plain text",
          score: 5,
        },
      ],
      coverage: [{ ...b, status: "ready", indexed: 1, total: 1 }],
    });
  };
  const cleanup = mountSearchPalette(document, fetcher, () => a, navigate);
  const key = (
    target: Element | Document,
    value: string,
    extra: KeyboardEventInit = {},
  ) =>
    target.dispatchEvent(
      new dom.window.KeyboardEvent("keydown", {
        key: value,
        bubbles: true,
        cancelable: true,
        ...extra,
      }),
    );
  try {
    key(document, "k", { metaKey: true });
    await vi.advanceTimersByTimeAsync(0);
    const input = document.getElementById("search-query") as HTMLInputElement;
    expect(document.activeElement).toBe(input);
    expect(document.querySelector("[role=dialog]")).not.toBeNull();
    expect(document.querySelector("main")!.hasAttribute("inert")).toBe(true);
    expect(document.querySelector(".search-chip")!.textContent).toContain(
      "Reader",
    );
    input.dispatchEvent(
      new dom.window.CompositionEvent("compositionstart", { bubbles: true }),
    );
    key(input, "Backspace");
    expect((document.querySelector(".search-chip") as HTMLElement).hidden).toBe(
      false,
    );
    input.dispatchEvent(
      new dom.window.CompositionEvent("compositionend", { bubbles: true }),
    );
    key(input, "Backspace");
    expect((document.querySelector(".search-chip") as HTMLElement).hidden).toBe(
      true,
    );
    input.value = "authentication @mark";
    input.setSelectionRange(input.value.length, input.value.length);
    input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    await Promise.resolve();
    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(document.querySelectorAll("[role=option]")).toHaveLength(1);
    key(input, "Enter");
    expect(input.value).toBe("authentication");
    expect(document.querySelector(".search-chip")!.textContent).toContain(
      "Marketing Backend",
    );
    await vi.advanceTimersByTimeAsync(220);
    expect(
      calls.some(
        (p) =>
          p.includes("project=" + b.id) && p.includes("query=authentication"),
      ),
    ).toBe(true);
    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector("[role=option]")!.textContent).toContain(
      "<img",
    );
    expect(input.getAttribute("aria-activedescendant")).toBe("search-option-0");
    key(input, "Enter");
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: b.id, fragment: "configuration" }),
    );
    expect(document.activeElement).toBe(trigger);
    expect(document.querySelector("main")!.hasAttribute("inert")).toBe(false);
    key(document, "k", { ctrlKey: true });
    key(input, "Backspace");
    input.value = "@";
    input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    key(input, "Escape");
    expect(
      (document.querySelector(".search-overlay") as HTMLElement).hidden,
    ).toBe(false);
    key(input, "Escape");
    expect(
      (document.querySelector(".search-overlay") as HTMLElement).hidden,
    ).toBe(true);
  } finally {
    cleanup();
    expect(document.querySelector("[role=dialog]")).toBeNull();
    dom.window.close();
  }
});
it("shows partial coverage/errors, supports explicit refresh, and cancels pending transport on disposal", async () => {
  vi.useFakeTimers();
  const dom = new JSDOM('<button id="search-open">Search</button>', {
    pretendToBeVisual: true,
  });
  const document = dom.window.document;
  let fail = false;
  let signal: AbortSignal | undefined;
  const fetcher: typeof fetch = async (input, init) => {
    signal = init?.signal ?? undefined;
    if (String(input) === "/api/projects")
      return Response.json({ projects: [a] });
    if (fail) return new Response("{}", { status: 503 });
    return Response.json({
      results: [],
      coverage: [
        {
          ...a,
          status: "unavailable",
          indexed: 0,
          total: 0,
          message: "Check configuration",
        },
      ],
    });
  };
  const cleanup = mountSearchPalette(
    document,
    fetcher,
    () => a,
    async () => {},
  );
  try {
    document.getElementById("search-open")!.click();
    const input = document.getElementById("search-query") as HTMLInputElement;
    input.value = "missing";
    input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    await vi.advanceTimersByTimeAsync(220);
    expect(document.querySelector("[role=status]")!.textContent).toContain(
      "incomplete",
    );
    expect(document.querySelector(".search-coverage")!.textContent).toContain(
      "unavailable",
    );
    fail = true;
    const buttons = [...document.querySelectorAll("button")];
    buttons.find((b) => b.textContent === "Refresh search")!.click();
    await vi.advanceTimersByTimeAsync(220);
    expect(document.querySelector("[role=status]")!.textContent).toContain(
      "unavailable",
    );
    cleanup();
    expect(signal?.aborted).toBe(true);
  } finally {
    cleanup();
    dom.window.close();
  }
});
