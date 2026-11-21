// @vitest-environment jsdom
import { createRef, useState } from "react";
import { MemoryRouter } from "react-router";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, it, expect } from "vitest";
import { TextInput } from "../../src/frontend/components/ui/TextInput";
import { Select } from "../../src/frontend/components/ui/Select";
import { Switch } from "../../src/frontend/components/ui/Switch";
import { Tabs } from "../../src/frontend/components/ui/Tabs";
import { IconButton } from "../../src/frontend/components/ui/IconButton";
import { Breadcrumbs } from "../../src/frontend/components/ui/Breadcrumbs";
afterEach(cleanup);
it("connects input labels/errors/ref and preserves native uncontrolled values and reset", () => {
  const ref = createRef<HTMLInputElement>();
  const view = render(
    <form>
      <TextInput
        ref={ref}
        label="Name"
        description="Local label"
        error="Required"
        defaultValue="Example"
      />
      <Select label="Source" defaultValue="docs">
        <option value="docs">Docs</option>
        <option value="readme">README</option>
      </Select>
    </form>,
  );
  const input = screen.getByRole("textbox", {
    name: "Name",
  }) as HTMLInputElement;
  expect(input).toBe(ref.current);
  expect(input.getAttribute("aria-invalid")).toBe("true");
  for (const id of input.getAttribute("aria-describedby")!.split(" "))
    expect(document.getElementById(id)).not.toBeNull();
  fireEvent.change(input, { target: { value: "Changed" } });
  expect(input.value).toBe("Changed");
  fireEvent.change(screen.getByRole("combobox", { name: "Source" }), {
    target: { value: "readme" },
  });
  expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe(
    "readme",
  );
  view.container.querySelector("form")!.reset();
  expect(input.value).toBe("Example");
  expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe(
    "docs",
  );
});
it("keeps controlled switch state and native disabled semantics", () => {
  function Preview() {
    const [checked, setChecked] = useState(false);
    return (
      <>
        <Switch
          label="Preview"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
        />
        <Switch label="Locked" disabled defaultChecked />
      </>
    );
  }
  render(<Preview />);
  const control = screen.getByRole("switch", {
    name: "Preview",
  }) as HTMLInputElement;
  fireEvent.click(control);
  expect(control.checked).toBe(true);
  fireEvent.click(control);
  expect(control.checked).toBe(false);
  expect(
    (screen.getByRole("switch", { name: "Locked" }) as HTMLInputElement)
      .disabled,
  ).toBe(true);
});
it("supports manual tab keyboard focus, disabled skipping and associated panels", () => {
  render(
    <Tabs
      label="Samples"
      items={[
        { id: "one", label: "One", content: "First panel" },
        {
          id: "locked",
          label: "Locked",
          disabled: true,
          content: "Locked panel",
        },
        { id: "two", label: "Two", content: "Second panel" },
      ]}
    />,
  );
  const one = screen.getByRole("tab", { name: "One" }),
    two = screen.getByRole("tab", { name: "Two" });
  one.focus();
  fireEvent.keyDown(one, { key: "ArrowRight" });
  expect(document.activeElement).toBe(two);
  expect(one.getAttribute("aria-selected")).toBe("true");
  fireEvent.click(two);
  expect(two.getAttribute("aria-selected")).toBe("true");
  expect(screen.getByRole("tabpanel").textContent).toBe("Second panel");
  expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(
    two.id,
  );
  fireEvent.keyDown(two, { key: "Home" });
  expect(document.activeElement).toBe(one);
  fireEvent.keyDown(one, { key: "End" });
  expect(document.activeElement).toBe(two);
});
it("labels icon actions once and breadcrumbs identify only the current location", () => {
  render(
    <MemoryRouter>
      <IconButton icon="settings" label="Preferences" />
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Current" }]} />
    </MemoryRouter>,
  );
  expect(
    screen
      .getByRole("button", { name: "Preferences" })
      .querySelector("svg")
      ?.getAttribute("aria-hidden"),
  ).toBe("true");
  expect(screen.queryByRole("img")).toBeNull();
  expect(screen.getByText("Current").getAttribute("aria-current")).toBe("page");
  expect(screen.getByRole("link", { name: "Home" })).toBeTruthy();
});
