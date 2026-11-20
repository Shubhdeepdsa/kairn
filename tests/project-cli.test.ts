import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, it } from "vitest";
import { ProjectLibrary } from "../src/core/library.js";
import { runProjectCommand } from "../src/cli/project.js";
const roots: string[] = [];
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "kairn-cli-project-"));
  roots.push(root);
  const project = join(root, "project");
  await mkdir(join(project, "docs"), { recursive: true });
  await mkdir(join(project, ".github"));
  await writeFile(join(project, "docs", "overview.md"), "# Overview");
  await writeFile(join(project, "README.md"), "# Project");
  await writeFile(join(project, ".github", "DEPLOYMENT.md"), "# Deploy");
  return { root, project, data: join(root, "data") };
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
it("leaves state unchanged when project mutation is canceled or noninteractive approval is absent", async () => {
  const f = await fixture();
  const library = new ProjectLibrary(f.data);
  const messages: string[] = [];
  expect(
    await runProjectCommand(
      ["add", "--cwd", f.project],
      library,
      true,
      { value: async () => null, approve: async () => false },
      (s) => messages.push(s),
    ),
  ).toBe(2);
  expect(await library.list()).toEqual([]);
  await expect(
    runProjectCommand(
      ["add", "--cwd", f.project],
      library,
      false,
      undefined,
      () => {},
    ),
  ).rejects.toThrow("--yes");
  expect(await library.list()).toEqual([]);
  expect(messages.join("")).toContain("Register");
});
it("supports fresh-process Library, sources, overrides, portable config and safe unregister", async () => {
  const f = await fixture();
  const env = { ...process.env, CI: "1", KAIRN_DATA_DIR: f.data };
  const binary = resolve("dist/index.js");
  function cli(args: string[]) {
    const result = spawnSync(process.execPath, [binary, ...args], {
      cwd: f.root,
      env,
      encoding: "utf8",
    });
    expect(result.status, result.stderr).toBe(0);
    return result.stdout;
  }
  cli(["project", "add", "--cwd", f.project, "--name", "Example", "--yes"]);
  const id = JSON.parse(cli(["project", "list"]))[0].id;
  cli(["project", "rename", id, "--name", "Renamed", "--yes"]);
  for (const path of ["README.md", ".github/DEPLOYMENT.md"])
    cli(["project", "sources", "add", id, "--path", path, "--yes"]);
  cli(["project", "ignore", "add", id, "--pattern", "**/AGENTS.md", "--yes"]);
  cli(["project", "config", "init", id, "--yes"]);
  const config = await readFile(
    join(f.project, ".kairn", "config.json"),
    "utf8",
  );
  expect(config).not.toContain(f.root);
  expect(
    JSON.parse(cli(["project", "show", id])).effective.sources,
  ).toHaveLength(3);
  const child = spawn(
    process.execPath,
    [binary, "run", "--project", id, "--port", "0", "--no-open"],
    { cwd: f.root, env, stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "";
  let errors = "";
  child.stderr!.on("data", (data) => {
    errors += String(data);
  });
  try {
    const url = await new Promise<string>((resolve, reject) => {
      child.stdout!.on("data", (data) => {
        output += String(data);
        const match = /http:\/\/127\.0\.0\.1:\d+/.exec(output);
        if (match) resolve(match[0]);
      });
      child.once("error", reject);
      child.once("exit", () => reject(new Error(errors)));
    });
    const tree = await (await fetch(url + "/api/tree")).json();
    expect(JSON.stringify(tree)).not.toContain(f.project);
    function flatten(
      nodes: { kind: string; id?: string; children?: unknown[] }[],
    ): string[] {
      return nodes.flatMap((node) =>
        node.kind === "document"
          ? [node.id!]
          : flatten(node.children as typeof nodes),
      );
    }
    const ids = flatten(tree.tree);
    expect(ids).toHaveLength(3);
    for (const docId of ids) {
      const doc = await (await fetch(url + "/api/documents/" + docId)).json();
      expect(doc.html).toContain("<h1");
      expect(JSON.stringify(doc)).not.toContain(f.root);
    }
  } finally {
    const exited = once(child, "exit");
    child.kill(process.platform === "win32" ? "SIGTERM" : "SIGINT");
    await exited;
  }
  cli(["project", "sources", "remove", id, "--path", "README.md", "--yes"]);
  expect(
    JSON.parse(cli(["project", "sources", "list", id])).sources,
  ).toHaveLength(2);
  cli(["project", "remove", id, "--yes"]);
  expect(JSON.parse(cli(["project", "list"]))).toEqual([]);
  expect(await readFile(join(f.project, ".kairn", "config.json"), "utf8")).toBe(
    config,
  );
  expect(await readFile(join(f.project, "README.md"), "utf8")).toBe(
    "# Project",
  );
}, 20000);
