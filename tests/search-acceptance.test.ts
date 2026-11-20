import { spawn, spawnSync } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { once } from "node:events";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  rename,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { JSDOM } from "jsdom";
import { expect, it } from "vitest";
import { mountViewer } from "../src/viewer/client.js";
import type {
  SearchResponse,
  SearchProject,
} from "../src/core/search-contracts.js";
async function observe(
  document: Document,
  predicate: () => boolean,
): Promise<void> {
  if (predicate()) return;
  await new Promise<void>((resolve, reject) => {
    const observer = new document.defaultView!.MutationObserver(() => {
      if (predicate()) {
        observer.disconnect();
        clearTimeout(timeout);
        resolve();
      }
    });
    const timeout = setTimeout(() => {
      observer.disconnect();
      reject(
        new Error(
          "Timed out waiting for observable reader state: " +
            document.body.textContent,
        ),
      );
    }, 10000);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });
  });
}
it("accepts the clean-installed package: three-project search, real HTTP palette navigation, live indexing, unavailable/unregistered projects, corrupt-cache restart and transient search", async () => {
  const root = await mkdtemp(join(tmpdir(), "kairn-search-acceptance-"));
  const data = join(root, "data");
  const env = { ...process.env, CI: "1", KAIRN_DATA_DIR: data };
  const children: ChildProcess[] = [];
  const cleanups: Array<() => void> = [];
  const doms: JSDOM[] = [];
  const command = (binary: string, args: string[], cwd = root): string => {
    const result = spawnSync(process.execPath, [binary, ...args], {
      cwd,
      env,
      encoding: "utf8",
    });
    expect(result.status, result.stderr + "\n" + result.stdout).toBe(0);
    return result.stdout;
  };
  try {
    const npm = join(dirname(process.env.npm_execpath!), "npm-cli.js");
    const packed = JSON.parse(
      command(
        npm,
        ["pack", "--json", "--pack-destination", root],
        resolve("."),
      ),
    )[0].filename as string;
    command(npm, [
      "install",
      "--prefix",
      join(root, "install"),
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--offline",
      join(root, packed),
    ]);
    const binary = join(
      root,
      "install",
      "node_modules",
      "kairn",
      "dist",
      "index.js",
    );
    expect(command(binary, ["--help"])).toContain("kairn run");
    expect(command(binary, ["--version"]).trim()).toBe("0.1.0");
    const paths: string[] = [];
    const original = new Map<string, string>();
    for (const name of ["A", "B", "C"]) {
      const p = join(root, "project-" + name);
      paths.push(p);
      await mkdir(join(p, "docs"), { recursive: true });
      const markdown = `# Project ${name}\n\n## Configuration\n\nconfiguration resolver authentication createDocumentService node:sqlite --no-open GET /api/tree docs/architecture.md\n`;
      const file = join(p, "docs", "README.md");
      await writeFile(file, markdown);
      original.set(file, markdown);
      command(binary, [
        "project",
        "add",
        "--cwd",
        p,
        "--name",
        "Project " + name,
        "--yes",
      ]);
    }
    const projects = JSON.parse(
      command(binary, ["project", "list"]),
    ) as SearchProject[];
    const a = projects.find((p) => p.name === "Project A")!,
      b = projects.find((p) => p.name === "Project B")!,
      c = projects.find((p) => p.name === "Project C")!;
    async function start(
      args: string[],
    ): Promise<{ child: ChildProcess; url: string }> {
      const child = spawn(
        process.execPath,
        [binary, "run", ...args, "--port", "0", "--no-open"],
        { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] },
      );
      children.push(child);
      let output = "",
        errors = "";
      child.stderr!.on("data", (d) => (errors += String(d)));
      const url = await new Promise<string>((resolve, reject) => {
        child.stdout!.on("data", (d) => {
          output += String(d);
          const match = /http:\/\/127\.0\.0\.1:\d+/.exec(output);
          if (match) resolve(match[0]);
        });
        child.once("error", reject);
        child.once("exit", () => reject(new Error(errors)));
      });
      return { child, url };
    }
    async function stop(child: ChildProcess, url: string): Promise<void> {
      const exited = once(child, "exit");
      child.kill(process.platform === "win32" ? "SIGTERM" : "SIGINT");
      const [code] = await exited;
      if (process.platform !== "win32") expect(code).toBe(0);
      await expect(fetch(url + "/api/health")).rejects.toThrow();
    }
    const server = await start(["--project", a.id]);
    const search = async (
      query: string,
      project?: string,
    ): Promise<SearchResponse> => {
      const params = new URLSearchParams({ query, refresh: "1" });
      if (project) params.set("project", project);
      const r = await fetch(server.url + "/api/search?" + params);
      expect(r.status).toBe(200);
      return (await r.json()) as SearchResponse;
    };
    expect(
      (await search("authentication", a.id)).results.map((r) => r.projectId),
    ).toEqual([a.id]);
    expect(
      new Set((await search("authentication")).results.map((r) => r.projectId)),
    ).toEqual(new Set([a.id, b.id, c.id]));
    for (const q of [
      "createDocumentService",
      "node:sqlite",
      "--no-open",
      "GET /api/tree",
      "docs/architecture.md",
      "configuration resolver",
    ])
      expect((await search(q, b.id)).results).toHaveLength(1);
    for (const asset of [
      "/search-palette.js",
      "/core/search-palette.js",
      "/navigation.js",
    ])
      expect((await fetch(server.url + asset)).status).toBe(200);
    const page = await (await fetch(server.url)).text();
    const dom = new JSDOM(page, { url: server.url, pretendToBeVisual: true });
    doms.push(dom);
    const document = dom.window.document;
    const fetcher: typeof fetch = (input, init) =>
      fetch(new URL(String(input), server.url), init);
    const dispose = await mountViewer(document, fetcher);
    cleanups.push(dispose);
    const key = (
      target: Element | Document,
      key: string,
      extra: KeyboardEventInit = {},
    ) =>
      target.dispatchEvent(
        new dom.window.KeyboardEvent("keydown", {
          key,
          bubbles: true,
          cancelable: true,
          ...extra,
        }),
      );
    key(document, "k", { ctrlKey: true });
    const input = document.getElementById("search-query") as HTMLInputElement;
    expect(document.querySelector(".search-chip")!.textContent).toContain(
      "Project A",
    );
    key(input, "Backspace");
    input.value = "configuration resolver @proj";
    input.setSelectionRange(input.value.length, input.value.length);
    input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    await observe(
      document,
      () => document.querySelectorAll("[role=option]").length === 3,
    );
    key(input, "ArrowDown");
    key(input, "Enter");
    expect(input.value).toBe("configuration resolver");
    expect(document.querySelector(".search-chip")!.textContent).toContain(
      "Project B",
    );
    await observe(
      document,
      () =>
        document
          .querySelector("[role=option]")
          ?.textContent?.includes("docs/README.md") ?? false,
    );
    key(input, "Enter");
    await observe(
      document,
      () => document.querySelector("article h1")?.textContent === "Project B",
    );
    expect(dom.window.location.hash).toContain("/" + b.id + "/");
    expect(dom.window.location.hash).toMatch(/\/configuration$/);
    dom.window.history.back();
    await observe(
      document,
      () => document.querySelector("article h1")?.textContent === "Project A",
    );
    dom.window.history.forward();
    await observe(
      document,
      () => document.querySelector("article h1")?.textContent === "Project B",
    );
    const deep = new JSDOM(page, {
      url: server.url + dom.window.location.hash,
      pretendToBeVisual: true,
    });
    doms.push(deep);
    cleanups.push(await mountViewer(deep.window.document, fetcher));
    expect(deep.window.document.querySelector("article h1")?.textContent).toBe(
      "Project B",
    );
    const changed = join(paths[0]!, "docs", "README.md");
    await writeFile(
      changed,
      "# Project A\n\n## Configuration\n\nreplacementtoken",
    );
    expect((await search("replacementtoken", a.id)).results).toHaveLength(1);
    expect((await search("authentication", a.id)).results).toHaveLength(0);
    command(binary, [
      "project",
      "ignore",
      "add",
      a.id,
      "--pattern",
      "**/README.md",
      "--yes",
    ]);
    expect((await search("replacementtoken", a.id)).results).toHaveLength(0);
    command(binary, [
      "project",
      "ignore",
      "remove",
      a.id,
      "--pattern",
      "**/README.md",
      "--yes",
    ]);
    expect((await search("replacementtoken", a.id)).results).toHaveLength(1);
    await writeFile(
      join(paths[0]!, "EXTRA.md"),
      "# Additional\n\nextrasourcetoken",
    );
    command(binary, [
      "project",
      "sources",
      "add",
      a.id,
      "--path",
      "EXTRA.md",
      "--yes",
    ]);
    expect((await search("extrasourcetoken", a.id)).results).toHaveLength(1);
    command(binary, [
      "project",
      "sources",
      "remove",
      a.id,
      "--path",
      "EXTRA.md",
      "--yes",
    ]);
    expect((await search("extrasourcetoken", a.id)).results).toHaveLength(0);
    const beforeB = await readFile(
      join(paths[1]!, "docs", "README.md"),
      "utf8",
    );
    command(binary, ["project", "remove", b.id, "--yes"]);
    expect(
      (await search("authentication")).results.some(
        (r) => r.projectId === b.id,
      ),
    ).toBe(false);
    expect(await readFile(join(paths[1]!, "docs", "README.md"), "utf8")).toBe(
      beforeB,
    );
    await rename(paths[2]!, paths[2] + "-unavailable");
    const unavailable = await search("authentication");
    expect(unavailable.coverage.find((p) => p.id === c.id)?.status).toBe(
      "unavailable",
    );
    expect(unavailable.results.some((r) => r.projectId === c.id)).toBe(false);
    await rename(paths[2] + "-unavailable", paths[2]!);
    for (const cleanup of cleanups.splice(0)) cleanup();
    await stop(server.child, server.url);
    await writeFile(
      join(data, "search", "search.sqlite"),
      "offline corrupt acceptance index",
    );
    const recovered = await start(["--project", a.id]);
    const response = await fetch(
      recovered.url + "/api/search?query=replacementtoken&refresh=1",
    );
    expect(response.status).toBe(200);
    expect((await response.json()).results).toHaveLength(1);
    await stop(recovered.child, recovered.url);
    const local = join(root, "local");
    await mkdir(join(local, "docs"), { recursive: true });
    await writeFile(
      join(local, "docs", "local.md"),
      "# Local\n\ntransienttoken",
    );
    const transient = await start(["--cwd", local]);
    const context = await (await fetch(transient.url + "/api/context")).json();
    expect(context.id).toMatch(/^session-/);
    expect(
      (
        await (
          await fetch(
            transient.url +
              "/api/search?query=transienttoken&project=" +
              context.id,
          )
        ).json()
      ).results,
    ).toHaveLength(1);
    expect(
      (
        await (
          await fetch(transient.url + "/api/search?query=transienttoken")
        ).json()
      ).results,
    ).toHaveLength(0);
    await stop(transient.child, transient.url);
    expect(JSON.parse(command(binary, ["project", "list"]))).toHaveLength(2);
    for (const [file, content] of original)
      if (file !== changed) expect(await readFile(file, "utf8")).toBe(content);
  } finally {
    for (const cleanup of cleanups) cleanup();
    for (const dom of doms) dom.window.close();
    for (const child of children)
      if (child.exitCode === null && child.signalCode === null) {
        const ended = once(child, "exit");
        child.kill();
        await ended;
      }
    await rm(root, { recursive: true, force: true });
  }
}, 90000);
