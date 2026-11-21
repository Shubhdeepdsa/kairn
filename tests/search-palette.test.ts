import { afterEach, expect, it, vi } from "vitest";
import { SearchPalette } from "../src/core/search-palette.js";
import type { SearchResponse } from "../src/core/search-contracts.js";
afterEach(() => vi.useRealTimers());
const a = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Marketing Backend",
  },
  b = { id: "22222222-2222-4222-8222-222222222222", name: "Marketing Backend" };
it("separates scope from text, preserves selector-surrounding terms, supports duplicate names and IME-safe Backspace", () => {
  vi.useFakeTimers();
  const controller = new SearchPalette({
    search: async () => ({ results: [], coverage: [] }),
    changed: () => {},
  });
  controller.setProjects([b, a]);
  controller.open(a);
  expect(controller.state.scope).toEqual({ type: "project", projectId: a.id });
  expect(controller.backspace(0, 0, true)).toBe(false);
  expect(controller.backspace(0, 1, false)).toBe(false);
  controller.setQuery("text");
  expect(controller.backspace(0, 0, false)).toBe(false);
  controller.setQuery("");
  expect(controller.backspace(0, 0, false)).toBe(true);
  controller.setQuery("authentication @mark configuration", 20);
  expect(controller.state.picker).not.toBeNull();
  expect(controller.state.suggestions.map((p) => p.id)).toEqual([a.id, b.id]);
  controller.move(1);
  controller.choose();
  expect(controller.state.scope).toEqual({ type: "project", projectId: b.id });
  expect(controller.state.query).toBe("authentication configuration");
  controller.removeScope();
  controller.setQuery("@mark");
  controller.escape();
  expect(controller.state.open).toBe(true);
  expect(controller.state.picker).toBeNull();
  controller.escape();
  expect(controller.state.open).toBe(false);
  controller.dispose();
});
it("debounces, discards replies after query/scope changes and close, and reports partial/error states", async () => {
  vi.useFakeTimers();
  const replies: Array<(r: SearchResponse) => void> = [];
  const search = vi.fn(
    () => new Promise<SearchResponse>((resolve) => replies.push(resolve)),
  );
  const controller = new SearchPalette({ search, changed: () => {} });
  controller.open(a);
  controller.setQuery("a");
  controller.setQuery("auth");
  await vi.advanceTimersByTimeAsync(200);
  expect(search).toHaveBeenCalledTimes(1);
  controller.removeScope();
  await vi.advanceTimersByTimeAsync(200);
  replies[0]!({ results: [], coverage: [] });
  await Promise.resolve();
  expect(controller.state.phase).toBe("loading");
  replies[1]!({
    results: [],
    coverage: [{ ...a, status: "indexing", indexed: 2, total: 10 }],
  });
  await Promise.resolve();
  expect(controller.state.message).toContain("incomplete");
  controller.setQuery("later");
  controller.close();
  await vi.advanceTimersByTimeAsync(1000);
  expect(search).toHaveBeenCalledTimes(2);
  controller.dispose();
});

it("closes empty scoped search and emits project navigation for empty global selections", async () => {
  vi.useFakeTimers();
  const search = vi.fn(async () => ({ results: [], coverage: [] }));
  const controller = new SearchPalette({ search, changed: () => {} });
  controller.setProjects([b, a]);
  controller.open(a);
  expect(controller.choose()).toEqual({ kind: "close" });
  expect(controller.state.open).toBe(false);
  controller.open(a);
  controller.removeScope();
  expect(controller.state.projectChoices).toBe(true);
  controller.move(1);
  expect(controller.choose()).toEqual({ kind: "project", projectId: b.id });
  expect(controller.state.open).toBe(false);
  controller.open(a);
  controller.removeScope();
  controller.setQuery("@mark");
  controller.move(1);
  expect(controller.choose()).toEqual({ kind: "project", projectId: b.id });
  await vi.advanceTimersByTimeAsync(1000);
  expect(search).not.toHaveBeenCalled();
  controller.dispose();
});
