// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ErrorBoundary } from "../../src/frontend/app/ErrorBoundary";
afterEach(cleanup);
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
