import { spawn, spawnSync } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { once } from "node:events";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runDocumentation } from "../src/cli/run.js";
import type { RunContext } from "../src/cli/run.js";
import { renderMarkdown } from "../src/viewer/markdown.js";
const roots: string[] = [];
const children: ChildProcess[] = [];
async function fixture(docs = true): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "kairn-run-"));
  roots.push(root);
  if (docs) {
    await mkdir(join(root, "docs"));
    await writeFile(join(root, "docs", "README.md"), "# Read only");
  }
  return root;
}
afterEach(async () => {
  for (const child of children.splice(0))
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill();
      await exited;
    }
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
function context(
  directory: string,
  controller: AbortController,
  overrides: Partial<RunContext> = {},
): RunContext {
  return {
    directory,
    port: 0,
    noOpen: true,
    interactive: false,
    canOpenBrowser: false,
    signal: controller.signal,
    viewer: { page: "<h1>Kairn</h1>", script: "", style: "", renderMarkdown },
    chooseRoot: async () => null,
    openBrowser: async () => {},
    message: () => {},
    ...overrides,
  };
}
describe("run workflow", () => {
  it("serves without writes, skips browser and closes on abort", async () => {
    const root = await fixture();
    const controller = new AbortController();
    const openBrowser = vi.fn();
    let url = "";
    const running = runDocumentation(
      context(root, controller, {
        openBrowser,
        message: (text) => {
          const match = /http:\/\/127\.0\.0\.1:\d+/.exec(text);
          if (match) {
            url = match[0];
            controller.abort();
          }
        },
      }),
    );
    expect(await running).toBe(0);
    expect(openBrowser).not.toHaveBeenCalled();
    await expect(fetch(url + "/api/health")).rejects.toThrow();
    expect(await readFile(join(root, "docs", "README.md"), "utf8")).toBe(
      "# Read only",
    );
    expect(await readdir(root)).toEqual(["docs"]);
  });
  it("opens only the generated URL with permission, and browser failure is nonfatal", async () => {
    const root = await fixture();
    const controller = new AbortController();
    const messages: string[] = [];
    const openBrowser = vi.fn(async (url) => {
      expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
      expect((await fetch(url + "/api/health")).status).toBe(200);
      controller.abort();
      throw new Error("no browser");
    });
    expect(
      await runDocumentation(
        context(root, controller, {
          noOpen: false,
          canOpenBrowser: true,
          openBrowser,
          message: (text) => messages.push(text),
        }),
      ),
    ).toBe(0);
    expect(openBrowser).toHaveBeenCalledOnce();
    expect(messages.join("\n")).toContain("manually");
  });
  it("fails without docs in headless use and cancels missing-root prompts", async () => {
    const root = await fixture(false);
    const controller = new AbortController();
    await expect(runDocumentation(context(root, controller))).rejects.toThrow(
      "No docs/",
    );
    expect(
      await runDocumentation(context(root, controller, { interactive: true })),
    ).toBe(2);
    expect(await readdir(root)).toEqual([]);
  });
  it("uses an explicitly selected existing root without creating docs", async () => {
    const root = await fixture(false);
    await mkdir(join(root, "notes"));
    await writeFile(join(root, "notes", "note.md"), "# Selected");
    const controller = new AbortController();
    expect(
      await runDocumentation(
        context(root, controller, {
          interactive: true,
          chooseRoot: async () => "notes",
          message: (text) => {
            if (text.includes("http://")) controller.abort();
          },
        }),
      ),
    ).toBe(0);
    expect(await readdir(root)).toEqual(["notes"]);
  });
  it("does not start when already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    expect(await runDocumentation(context("unused", controller))).toBe(0);
  });
});
describe("built run command", () => {
  it("validates flags and missing docs without launching a browser", async () => {
    const root = await fixture(false);
    for (const args of [
      ["run", "--port", "-1"],
      ["run", "--port", "65536"],
      ["run", "--port", "1.5"],
      ["run", "--yes"],
      ["init", "--port", "0"],
      ["--no-open"],
      ["run", "--cwd", root, "--no-open"],
    ]) {
      const result = spawnSync(
        process.execPath,
        [resolve("dist/index.js"), ...args],
        { encoding: "utf8", env: { ...process.env, CI: "1" } },
      );
      expect(result.status, result.stdout).toBe(1);
      expect(result.stderr).toContain("Kairn:");
    }
    expect(await readdir(root)).toEqual([]);
  });
  it("reads nested files through HTTP and terminates on interruption", async () => {
    const root = await fixture();
    await mkdir(join(root, "docs", "guide"));
    await writeFile(
      join(root, "docs", "guide", "start.md"),
      "# Nested\n\n- Works",
    );
    const child = spawn(
      process.execPath,
      [
        resolve("dist/index.js"),
        "run",
        "--cwd",
        root,
        "--port",
        "0",
        "--no-open",
      ],
      { env: { ...process.env, CI: "1" }, stdio: ["ignore", "pipe", "pipe"] },
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
      child.once("exit", () =>
        reject(new Error(`Exited before ready: ${errors}`)),
      );
    });
    expect((await fetch(url + "/api/health")).status).toBe(200);
    const tree = await (await fetch(url + "/api/tree")).json();
    const id = tree.tree[0].children[0].id;
    const document = await (await fetch(url + "/api/documents/" + id)).json();
    expect(document.html).toContain('<h1 id="nested">Nested</h1>');
    expect(document.markdown).toContain("- Works");
    const exited = once(child, "exit");
    child.kill(process.platform === "win32" ? "SIGTERM" : "SIGINT");
    const [code] = await exited;
    if (process.platform !== "win32") {
      expect(code).toBe(0);
      expect(output).toContain("Kairn stopped.");
    }
    await expect(fetch(url + "/api/health")).rejects.toThrow();
    expect(
      await readFile(join(root, "docs", "guide", "start.md"), "utf8"),
    ).toBe("# Nested\n\n- Works");
  });
});
