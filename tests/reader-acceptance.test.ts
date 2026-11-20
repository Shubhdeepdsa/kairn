import { spawn, spawnSync } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { JSDOM } from "jsdom";
import { afterEach, expect, it } from "vitest";
import { mountViewer } from "../src/viewer/client.js";
const roots: string[] = [];
const children: ChildProcess[] = [];
const doms: JSDOM[] = [];
afterEach(async () => {
  doms.splice(0).forEach((dom) => dom.window.close());
  for (const child of children.splice(0)) {
    if (child.exitCode === null && child.signalCode === null) {
      const closed = once(child, "exit");
      child.kill();
      await closed;
    }
  }
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function observe(document: Document, predicate: () => boolean) {
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
it("uses the compiled run command and real API for live content, sources, ignore and invalid-config recovery", async () => {
  const root = await mkdtemp(join(tmpdir(), "kairn-reader-"));
  roots.push(root);
  const project = join(root, "project");
  await mkdir(join(project, "docs"), { recursive: true });
  await mkdir(join(project, ".github"));
  await writeFile(
    join(project, "docs", "overview.md"),
    "# Overview\n\n[Readme](../README.md) [Broken](missing.md)",
  );
  await writeFile(join(project, "docs", "AGENTS.md"), "# Agents");
  await writeFile(join(project, "README.md"), "# Root\n\n## Configuration");
  await writeFile(join(project, ".github", "DEPLOYMENT.md"), "# Deployment");
  const env = { ...process.env, CI: "1", KAIRN_DATA_DIR: join(root, "data") };
  const binary = resolve("dist/index.js");
  function cli(args: string[]) {
    const result = spawnSync(process.execPath, [binary, ...args], {
      cwd: root,
      env,
      encoding: "utf8",
    });
    expect(result.status, result.stderr).toBe(0);
    return result.stdout;
  }
  cli(["project", "add", "--cwd", project, "--yes"]);
  const id = JSON.parse(cli(["project", "list"]))[0].id;
  const child = spawn(
    process.execPath,
    [binary, "run", "--project", id, "--port", "0", "--no-open"],
    { env, cwd: root, stdio: ["ignore", "pipe", "pipe"] },
  );
  children.push(child);
  let output = "";
  let errors = "";
  child.stderr!.on("data", (data) => {
    errors += String(data);
  });
  const url = await new Promise<string>((resolve, reject) => {
    child.stdout!.on("data", (data) => {
      output += String(data);
      const match = /http:\/\/127\.0\.0\.1:\d+/.exec(output);
      if (match) resolve(match[0]);
    });
    child.once("error", reject);
    child.once("exit", () => reject(new Error(errors)));
  });
  const shell = await (await fetch(url)).text();
  const dom = new JSDOM(shell, { url, pretendToBeVisual: true });
  doms.push(dom);
  const document = dom.window.document;
  const requests: string[] = [];
  const fetcher: typeof fetch = async (input, options) => {
    requests.push(String(input));
    return fetch(new URL(String(input), url), options);
  };
  const dispose = await mountViewer(document, fetcher);
  const overview = document.querySelector(
    'a[title="overview.md"]',
  ) as HTMLAnchorElement;
  expect(overview).toBeTruthy();
  overview.click();
  await observe(
    document,
    () => document.querySelector("h1")?.textContent === "Overview",
  );
  const hash = dom.window.location.hash;
  const trigger = () =>
    document.dispatchEvent(new dom.window.Event("visibilitychange"));
  await writeFile(
    join(project, "docs", "overview.md"),
    "# Updated\n\n[Readme](../README.md#configuration) [Broken](missing.md)",
  );
  trigger();
  await observe(
    document,
    () => document.querySelector("h1")?.textContent === "Updated",
  );
  expect(dom.window.location.hash).toBe(hash);
  cli(["project", "sources", "add", id, "--path", "README.md", "--yes"]);
  trigger();
  await observe(document, () =>
    Boolean(document.querySelector('a[title="README.md"]')),
  );
  (document.querySelector("article a") as HTMLAnchorElement).click();
  await observe(
    document,
    () => document.querySelector("h1")?.textContent === "Root",
  );
  expect(dom.window.location.hash).toContain("/configuration");
  cli([
    "project",
    "sources",
    "add",
    id,
    "--path",
    ".github/DEPLOYMENT.md",
    "--yes",
  ]);
  trigger();
  await observe(document, () =>
    Boolean(document.querySelector('a[title="DEPLOYMENT.md"]')),
  );
  cli(["project", "ignore", "add", id, "--pattern", "**/AGENTS.md", "--yes"]);
  trigger();
  await observe(
    document,
    () => !document.querySelector('a[title="AGENTS.md"]'),
  );
  cli([
    "project",
    "ignore",
    "remove",
    id,
    "--pattern",
    "**/AGENTS.md",
    "--yes",
  ]);
  trigger();
  await observe(document, () =>
    Boolean(document.querySelector('a[title="AGENTS.md"]')),
  );
  await mkdir(join(project, ".kairn"));
  await writeFile(
    join(project, ".kairn", "config.json"),
    "temporarily invalid",
  );
  trigger();
  await observe(document, () =>
    Boolean(
      document.getElementById("status")?.textContent?.includes("last valid"),
    ),
  );
  expect(document.querySelector("h1")?.textContent).toBe("Root");
  await rm(join(project, ".kairn", "config.json"));
  trigger();
  await observe(
    document,
    () =>
      !document.getElementById("status")?.textContent?.includes("last valid"),
  );
  expect(requests.some((path) => path.startsWith("/api/links/"))).toBe(true);
  dispose();
  const exited = once(child, "exit");
  child.kill(process.platform === "win32" ? "SIGTERM" : "SIGINT");
  await exited;
  await expect(fetch(url + "/api/health")).rejects.toThrow();
}, 30000);
