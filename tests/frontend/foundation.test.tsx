// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "../../src/frontend/app/App";
import { ErrorBoundary } from "../../src/frontend/app/ErrorBoundary";
afterEach(cleanup);
it("initializes the foundation without replacing the existing reader", () => {
  render(<App />);
  expect(
    screen.getByRole("heading", { name: "React foundation" }),
  ).toBeTruthy();
  expect(
    screen
      .getByRole("link", { name: "Open documentation reader" })
      .getAttribute("href"),
  ).toBe("/");
});
it("redacts unexpected render errors", () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  function Broken(): never {
    throw new Error("private machine path");
  }
  try {
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert").textContent).not.toContain(
      "private machine path",
    );
  } finally {
    log.mockRestore();
  }
});
