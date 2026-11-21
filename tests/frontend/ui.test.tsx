// @vitest-environment jsdom
import { createRef } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Button } from "../../src/frontend/components/ui/Button";
import { Icon } from "../../src/frontend/icons/Icon";
import { iconRegistry } from "../../src/frontend/icons/registry";
import type { SvgIconComponent } from "../../src/frontend/icons/registry";
import {
  ThemeProvider,
  useTheme,
} from "../../src/frontend/app/providers/ThemeProvider";
afterEach(cleanup);
it("shares native button behavior, refs and variants across consumers", () => {
  const ref = createRef<HTMLButtonElement>();
  const click = vi.fn();
  const view = render(
    <>
      <Button ref={ref} onClick={click}>
        One
      </Button>
      <Button variant="primary" size="sm">
        Two
      </Button>
    </>,
  );
  expect(ref.current).toBe(screen.getByRole("button", { name: "One" }));
  expect(ref.current?.type).toBe("button");
  expect(
    screen
      .getAllByRole("button")
      .every((b) => b.classList.contains("ui-button")),
  ).toBe(true);
  expect(screen.getByRole("button", { name: "Two" }).dataset.variant).toBe(
    "primary",
  );
  fireEvent.click(ref.current!);
  expect(click).toHaveBeenCalledTimes(1);
  view.rerender(
    <Button ref={ref} onClick={click} loading>
      One
    </Button>,
  );
  expect(ref.current?.disabled).toBe(true);
  expect(ref.current?.getAttribute("aria-busy")).toBe("true");
  fireEvent.click(ref.current!);
  expect(click).toHaveBeenCalledTimes(1);
  view.rerender(
    <Button ref={ref} disabled className="extra">
      One
    </Button>,
  );
  expect(ref.current?.disabled).toBe(true);
  expect(ref.current?.classList.contains("extra")).toBe(true);
});
it("resolves semantic icons and distinguishes decorative and meaningful SVGs", () => {
  const view = render(
    <>
      <Icon name="documentation" />
      <Icon name="settings" decorative={false} label="Settings" size="lg" />
    </>,
  );
  expect(Object.keys(iconRegistry)).toEqual([
    "documentation",
    "library",
    "settings",
    "sidebar",
    "wayfinding",
    "folder",
    "folderOpen",
    "file",
    "chevronRight",
    "chevronDown",
    "copy",
    "history",
    "refresh",
    "arrowLeft",
    "arrowRight",
    "search",
    "external",
    "check",
  ]);
  expect(
    view.container
      .querySelector('[aria-hidden="true"]')
      ?.getAttribute("focusable"),
  ).toBe("false");
  expect(
    screen.getByRole("img", { name: "Settings" }).classList.contains("icon-lg"),
  ).toBe(true);
  expect(view.container.querySelectorAll("svg")).toHaveLength(2);
});
it("applies theme at one root and restores the prior attribute on cleanup", () => {
  document.documentElement.setAttribute("data-theme", "light");
  function Preview() {
    const theme = useTheme();
    return (
      <Button onClick={() => theme.setAppearance("dark")}>
        {theme.appearance}
      </Button>
    );
  }
  const view = render(
    <ThemeProvider>
      <Preview />
    </ThemeProvider>,
  );
  expect(document.documentElement.dataset.theme).toBe("system");
  fireEvent.click(screen.getByRole("button", { name: "system" }));
  expect(document.documentElement.dataset.theme).toBe("dark");
  view.unmount();
  expect(document.documentElement.dataset.theme).toBe("light");
  document.documentElement.removeAttribute("data-theme");
});

it("replaces a Lucide registry entry with a custom SVG without changing consumers", () => {
  const CustomDocumentation: SvgIconComponent = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M4 4h16v16H4z" />
    </svg>
  );
  const entry = Object.getOwnPropertyDescriptor(iconRegistry, "documentation")!;
  function Consumers() {
    return (
      <>
        <Icon name="documentation" size="sm" className="custom-consumer" />
        <Icon
          name="documentation"
          decorative={false}
          label="Documentation"
          size="lg"
        />
      </>
    );
  }
  const view = render(<Consumers />);
  expect(view.container.querySelector(".lucide-book-open")).not.toBeNull();
  try {
    // Simulate changing the static registry entry; no runtime override API is needed.
    Object.defineProperty(iconRegistry, "documentation", {
      ...entry,
      value: CustomDocumentation,
    });
    view.rerender(<Consumers />);
    expect(view.container.querySelector(".lucide-book-open")).toBeNull();
    const decorative = view.container.querySelector('[aria-hidden="true"]')!;
    expect(decorative.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(decorative.getAttribute("focusable")).toBe("false");
    expect(decorative.getAttribute("stroke")).toBe("currentColor");
    expect(decorative.classList.contains("icon-sm")).toBe(true);
    expect(decorative.classList.contains("custom-consumer")).toBe(true);
    const meaningful = screen.getByRole("img", { name: "Documentation" });
    expect(meaningful.classList.contains("icon-lg")).toBe(true);
    expect(meaningful.getAttribute("aria-hidden")).toBeNull();
    expect(view.container.querySelectorAll("svg path")).toHaveLength(2);
  } finally {
    view.unmount();
    Object.defineProperty(iconRegistry, "documentation", entry);
  }
});

it("accepts initial preferences and propagates runtime accents with root cleanup", () => {
  document.documentElement.setAttribute("data-accent", "blue");
  function Preview() {
    const theme = useTheme();
    return (
      <Button onClick={() => theme.setAccent("forest")}>
        {theme.appearance} {theme.accent}
      </Button>
    );
  }
  const view = render(
    <ThemeProvider initialAppearance="dark" initialAccent="mineral">
      <Preview />
    </ThemeProvider>,
  );
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(document.documentElement.dataset.accent).toBe("mineral");
  fireEvent.click(screen.getByRole("button", { name: "dark mineral" }));
  expect(document.documentElement.dataset.accent).toBe("forest");
  view.unmount();
  expect(document.documentElement.dataset.accent).toBe("blue");
  document.documentElement.removeAttribute("data-accent");
});
