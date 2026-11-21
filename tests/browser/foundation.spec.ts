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
  const after = await page
    .getByRole("button", { name: "Preview light tokens (temporary)" })
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(after).not.toBe(before);
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
