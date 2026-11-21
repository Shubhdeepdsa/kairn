import { test, expect } from "@playwright/test";
import {
  mkdtemp,
  realpath,
  mkdir,
  writeFile,
  rm,
  readFile,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { once } from "node:events";
import { installPackedKairn } from "../helpers/install-package.js";
let root: string, url: string, child: ChildProcess | undefined;
const markdown =
  "# Browser fixture\n\n## Existing reader\n\nSearch and live reading remain available.\n";
test.beforeAll(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), "kairn-react-browser-")));
  const env = { ...process.env, CI: "1", KAIRN_DATA_DIR: join(root, "data") };
  const { binary, install } = await installPackedKairn(root, env);
  await expect(
    readFile(join(install, "node_modules", "react", "package.json")),
  ).rejects.toThrow();
  await mkdir(join(root, "project", "docs"), { recursive: true });
  await writeFile(join(root, "project", "docs", "README.md"), markdown);
  child = spawn(
    process.execPath,
    [binary, "run", "--cwd", join(root, "project"), "--port", "0", "--no-open"],
    { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] },
  );
  url = await new Promise<string>((resolve, reject) => {
    let output = "",
      errors = "";
    const timeout = setTimeout(
      () => reject(new Error("CLI startup timed out: " + errors)),
      15_000,
    );
    child!.stderr!.on("data", (data) => {
      errors += String(data);
    });
    child!.stdout!.on("data", (data) => {
      output += String(data);
      const match = /http:\/\/127\.0\.0\.1:\d+/.exec(output);
      if (match) {
        clearTimeout(timeout);
        resolve(match[0]);
      }
    });
    child!.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child!.once("exit", () => {
      clearTimeout(timeout);
      reject(new Error("CLI stopped before ready: " + errors));
    });
  });
});
test.afterAll(async () => {
  if (child && child.exitCode === null && child.signalCode === null) {
    const exited = once(child, "exit");
    child.kill(process.platform === "win32" ? "SIGTERM" : "SIGINT");
    await exited;
  }
  if (root) await rm(root, { recursive: true, force: true });
});
test("installed production app loads locally, routes/history work, shared tokens propagate, and the vanilla reader stays functional", async ({
  page,
  request,
}) => {
  const external: string[] = [],
    errors: string[] = [];
  page.on("request", (req) => {
    if (!req.url().startsWith(url + "/")) external.push(req.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(url + "/app");
  await expect(
    page.getByRole("heading", { name: "React foundation", exact: true }),
  ).toBeVisible();
  const load = await page.evaluate(() => {
    const navigation = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming;
    const scripts = performance
      .getEntriesByType("resource")
      .filter((entry) => entry.name.endsWith(".js"))
      .map((entry) => new URL(entry.name).pathname);
    return {
      responseEndMs: navigation.responseEnd,
      domContentLoadedMs: navigation.domContentLoadedEventEnd,
      observedAtMs: performance.now(),
      scripts,
    };
  });
  expect(
    load.scripts.some((path) => /SettingsPage|DocumentationPage/.test(path)),
  ).toBe(false);
  console.log("Initial installed-browser load:", JSON.stringify(load));
  const context = (await (await request.get(url + "/api/context")).json()) as {
    id: string;
  };
  await page.getByRole("link", { name: "Global settings contract" }).click();
  await expect(page).toHaveURL(url + "/app/settings/appearance");
  await expect(
    page.getByRole("heading", { name: "Settings architecture contract" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Collapse Global settings navigation" })
    .click();
  await expect(
    page.getByRole("navigation", { name: "Global settings navigation" }),
  ).toBeHidden();
  await page
    .getByRole("button", { name: "Expand Global settings navigation" })
    .click();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "React foundation", exact: true }),
  ).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(url + "/app/settings/appearance");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Settings architecture contract" }),
  ).toBeVisible();
  await page.goto(url + `/app/projects/${context.id}/settings/general`);
  await expect(
    page.getByRole("navigation", { name: "Project settings navigation" }),
  ).toBeVisible();
  await page.goto(url + "/app/unknown");
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  await page.goto(url + "/app");
  const preview = page.getByRole("button", {
    name: "Preview dark tokens (temporary)",
  });
  await expect(preview).toBeVisible();
  const before = await preview.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await preview.click();
  await expect
    .poll(() =>
      page
        .getByRole("button", { name: "Preview light tokens (temporary)" })
        .evaluate((element) => getComputedStyle(element).backgroundColor),
    )
    .not.toBe(before);
  await page.goto(url + "/");
  await expect(page.locator("article h1")).toHaveText("Browser fixture");
  const bookmark = page.url();
  await page
    .getByRole("button", {
      name: "Search documentation (Command or Control K)",
    })
    .click();
  await page.locator("#search-query").press("Enter");
  await expect(page.locator(".search-overlay")).toBeHidden();
  expect(page.url()).toBe(bookmark);
  await writeFile(
    join(root, "project", "docs", "README.md"),
    "# Browser fixture updated\n",
  );
  await expect(page.locator("article h1")).toHaveText(
    "Browser fixture updated",
  );
  await page.goto(bookmark);
  await expect(page.locator("article h1")).toHaveText(
    "Browser fixture updated",
  );
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
  for (const route of [
    "/api/not-a-page",
    "/app/assets/missing.js",
    "/app/index.html",
  ]) {
    const response = await request.get(url + route);
    expect(response.status()).toBe(404);
    expect(response.headers()["content-type"]).toContain("application/json");
  }
});

test("Mineral showcase themes, contrast, native keyboard controls and responsive reflow stay accessible", async ({
  page,
}) => {
  const external: string[] = [],
    errors: string[] = [];
  page.on("request", (r) => {
    if (!r.url().startsWith(url + "/")) external.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(url + "/app/design-system");
  await expect(
    page.getByRole("heading", { name: "Mineral Precision" }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const appearance = page.getByRole("combobox", { name: "Appearance" }),
    accent = page.getByRole("combobox", { name: "Accent palette" });
  async function expectBrand(theme: "light" | "dark", compact = false) {
    await expect
      .poll(() =>
        page
          .getByRole("img", { name: "Kairn", exact: true })
          .evaluate((element) => {
            const image = element as HTMLImageElement;
            return image.complete && image.naturalWidth > 0
              ? image.currentSrc
              : "";
          }),
      )
      .toContain(`kairn-${compact ? "mark" : "wordmark"}-${theme}-`);
  }
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  for (const mode of ["light", "dark"] as const)
    for (const palette of ["mineral", "blue", "forest"]) {
      await appearance.selectOption(mode);
      await accent.selectOption(palette);
      await expectBrand(mode);
      const violations = (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations;
      expect(
        violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
      const ratios = await page.evaluate(() => {
        function luminance(color: string) {
          const rgb = color
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number)
            .map((v) => {
              const c = v / 255;
              return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
            });
          return 0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!;
        }
        function ratio(a: string, b: string) {
          const x = luminance(a),
            y = luminance(b);
          return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
        }
        const button = getComputedStyle(
          document.querySelector('.showcase button[data-variant="primary"]')!,
        );
        const input = getComputedStyle(
          document.querySelector(".showcase input.ui-input")!,
        );
        const body = getComputedStyle(document.body);
        return {
          button: ratio(button.color, button.backgroundColor),
          body: ratio(body.color, body.backgroundColor),
          control: ratio(input.borderColor, input.backgroundColor),
        };
      });
      expect(ratios.button).toBeGreaterThanOrEqual(4.5);
      expect(ratios.body).toBeGreaterThanOrEqual(4.5);
      expect(ratios.control).toBeGreaterThanOrEqual(3);
    }
  await appearance.selectOption("system");
  await accent.selectOption("mineral");
  await page.emulateMedia({ colorScheme: "light" });
  await expectBrand("light");
  const light = await page
    .locator("body")
    .evaluate((e) => getComputedStyle(e).backgroundColor);
  await page.emulateMedia({ colorScheme: "dark" });
  await expectBrand("dark");
  const dark = await page
    .locator("body")
    .evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(dark).not.toBe(light);
  await appearance.selectOption("light");
  await expectBrand("light");
  expect(
    await page
      .locator("body")
      .evaluate((e) => getComputedStyle(e).backgroundColor),
  ).toBe(light);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    parseFloat(
      await page
        .locator("html")
        .evaluate((e) =>
          getComputedStyle(e).getPropertyValue("--kairn-motion"),
        ),
    ),
  ).toBe(0);
  const toggle = page.getByRole("switch", { name: "Enable preview" });
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(toggle).not.toBeChecked();
  expect(await toggle.evaluate((e) => getComputedStyle(e).outlineWidth)).toBe(
    "2px",
  );
  const first = page.getByRole("tab", { name: "Overview", exact: true }),
    second = page.getByRole("tab", { name: "Details", exact: true });
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect(second).toBeFocused();
  await expect(first).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Enter");
  await expect(second).toHaveAttribute("aria-selected", "true");
  await page
    .getByRole("button", { name: "Collapse Specimen navigation" })
    .click();
  await expect(
    page.getByRole("navigation", { name: "Specimen navigation" }),
  ).toBeHidden();
  await page
    .getByRole("button", { name: "Expand Specimen navigation" })
    .click();
  for (const width of [1100, 640, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const brand = page.getByRole("img", { name: "Kairn", exact: true });
    await expect
      .poll(() =>
        brand.evaluate((image, viewportWidth) => {
          const img = image as HTMLImageElement;
          return (
            img.complete &&
            img.naturalWidth > 0 &&
            img.currentSrc.includes(
              viewportWidth > 768
                ? "kairn-wordmark-light-"
                : "kairn-mark-light-",
            )
          );
        }, width),
      )
      .toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await appearance.selectOption("system");
  await expectBrand("dark", true);
  await page.emulateMedia({ colorScheme: "light" });
  await expectBrand("light", true);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test("Mineral visual baselines use one controlled platform and bundled fonts", async ({
  page,
}) => {
  test.skip(
    process.platform !== "darwin",
    "Pixel baselines use macOS Chromium only; behavior and contrast run on every OS.",
  );
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto(url + "/app/design-system");
  await expect(
    page.getByRole("heading", { name: "Mineral Precision" }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  for (const [mode, palette, name, width] of [
    ["light", "mineral", "mineral-light", 1100],
    ["dark", "mineral", "mineral-dark", 1100],
    ["light", "blue", "mineral-blue", 1100],
    ["light", "mineral", "mineral-mobile", 390],
  ] as const) {
    await page.getByRole("combobox", { name: "Appearance" }).selectOption(mode);
    await page
      .getByRole("combobox", { name: "Accent palette" })
      .selectOption(palette);
    await page.setViewportSize({ width, height: 900 });
    await expect(page).toHaveScreenshot(name + ".png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  }
});

test("Explorer shell specimen stays accessible across viewports and supports navigation and reflow", async ({
  page,
}) => {
  const external: string[] = [],
    errors: string[] = [];
  page.on("request", (req) => {
    if (!req.url().startsWith(url + "/")) external.push(req.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(url + "/app/design-system/explorer");
  await expect(
    page.getByText("Phase 6C-1 Visual Foundation Specimen"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "System Overview" }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  // Check accessibility with Axe in light & dark modes
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  for (const mode of ["light", "dark"] as const) {
    await page.getByRole("combobox", { name: "Theme" }).selectOption(mode);
    await page.waitForTimeout(200);
    const violations = (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations;
    expect(
      violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }

  // Interactive fixture switching: select Database Design in tree
  await page
    .getByRole("button", { name: "Database Design", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Database Design & Partitioning" }),
  ).toBeVisible();
  await expect(page.getByText("database.md")).toBeVisible();

  // Test responsive reflow:
  // 1. Laptop / Tablet (1000px): TOC outline hides, sidebar stays
  await page.setViewportSize({ width: 1000, height: 900 });
  await expect(page.locator(".explorer-outline-pane")).toBeHidden();
  await expect(page.locator(".explorer-sidebar")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);

  // 2. Mobile (390px): Sidebar hides, mobile bar appears with toggle
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".explorer-mobile-bar")).toBeVisible();
  await expect(page.locator(".explorer-sidebar")).toBeHidden();

  // Open mobile drawer
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.locator(".explorer-sidebar")).toBeVisible();
  await expect(page.locator(".explorer-sidebar")).toHaveClass(/is-open/);

  // Close mobile drawer
  await page.getByRole("button", { name: "Close navigation" }).click();
  await expect(page.locator(".explorer-sidebar")).toBeHidden();

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);

  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test("Explorer visual baselines use one controlled platform and bundled fonts", async ({
  page,
}) => {
  test.skip(
    process.platform !== "darwin",
    "Pixel baselines use macOS Chromium only; behavior and contrast run on every OS.",
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(url + "/app/design-system/explorer");
  await expect(
    page.getByText("Phase 6C-1 Visual Foundation Specimen"),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  for (const [mode, name, width] of [
    ["light", "explorer-light", 1280],
    ["dark", "explorer-dark", 1280],
    ["light", "explorer-mobile", 390],
  ] as const) {
    await page.getByRole("combobox", { name: "Theme" }).selectOption(mode);
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot(name + ".png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.01,
    });
  }
});
