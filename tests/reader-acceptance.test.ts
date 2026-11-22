import { spawn, spawnSync } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, mkdir, writeFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, it } from "vitest";

const roots: string[] = [];
const children: ChildProcess[] = [];

afterEach(async () => {
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

async function poll<T>(
  fn: () => Promise<T>,
  predicate: (val: T) => boolean,
  timeoutMs = 5000,
): Promise<T> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const val = await fn();
    if (predicate(val)) return val;
    await new Promise((r) => setTimeout(r, 50));
  }
  const val = await fn();
  if (predicate(val)) return val;
  throw new Error("poll timeout");
}

interface NavigationItem {
  readonly kind: "directory" | "document";
  readonly id?: string;
  readonly path: string;
  readonly title: string;
  readonly children?: readonly NavigationItem[];
  readonly [key: string]: unknown;
}

function flatten(tree: readonly NavigationItem[]): NavigationItem[] {
  return tree.flatMap((e) =>
    e.kind === "document" ? [e] : flatten(e.children ?? []),
  );
}

it("uses the compiled run command and real API for live content, sources, ignore and invalid-config recovery", async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), "kairn-reader-")));
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

  // 1. Root redirect to /app
  const rootResp = await fetch(url, { redirect: "manual" });
  expect(rootResp.status).toBe(302);
  expect(rootResp.headers.get("location")).toBe("/app");

  // 2. Initial tree
  const getTree = async () => {
    const res = await fetch(`${url}/api/tree`);
    return (await res.json()) as {
      tree: readonly NavigationItem[];
    };
  };
  const initialTree = await getTree();
  expect(
    initialTree.tree.some(
      (t) => t.path === "docs/overview.md" || t.path === "overview.md",
    ),
  ).toBe(true);
  const overviewEntry = initialTree.tree.find(
    (t) => t.path === "docs/overview.md" || t.path === "overview.md",
  )!;
  const overviewId = overviewEntry.id!;

  // 3. Initial document
  const getDoc = async (docId: string) => {
    const res = await fetch(`${url}/api/documents/${docId}`);
    return (await res.json()) as {
      title: string;
      markdown: string;
      headings: Array<{ level: number; title: string; fragment: string }>;
      html: string;
    };
  };
  const overviewDoc = await getDoc(overviewId);
  expect(overviewDoc.headings[0]?.title).toBe("Overview");

  // 4. Update file on disk -> live document update
  await writeFile(
    join(project, "docs", "overview.md"),
    "# Updated\n\n[Readme](../README.md#configuration) [Broken](missing.md)",
  );
  // Also call getTree to ensure refresh occurs
  const updatedDoc = await poll(
    async () => {
      await getTree();
      return getDoc(overviewId);
    },
    (doc) => doc.headings[0]?.title === "Updated",
  );
  expect(updatedDoc.headings[0]?.title).toBe("Updated");

  // 5. Add source README.md via CLI
  cli(["project", "sources", "add", id, "--path", "README.md", "--yes"]);
  const treeWithReadme = await poll(getTree, (t) =>
    flatten(t.tree).some((entry) => entry.path === "README.md"),
  );
  const readmeEntry = flatten(treeWithReadme.tree).find(
    (entry) => entry.path === "README.md",
  )!;
  const readmeDoc = await getDoc(readmeEntry.id!);
  expect(readmeDoc.headings[0]?.title).toBe("Root");

  // 6. Add source .github/DEPLOYMENT.md via CLI
  cli([
    "project",
    "sources",
    "add",
    id,
    "--path",
    ".github/DEPLOYMENT.md",
    "--yes",
  ]);
  await poll(getTree, (t) =>
    flatten(t.tree).some(
      (entry) =>
        entry.path === ".github/DEPLOYMENT.md" ||
        entry.path === "DEPLOYMENT.md",
    ),
  );

  // 7. Add ignore pattern **/AGENTS.md
  cli(["project", "ignore", "add", id, "--pattern", "**/AGENTS.md", "--yes"]);
  await poll(
    getTree,
    (t) => !flatten(t.tree).some((entry) => entry.path.includes("AGENTS.md")),
  );

  // 8. Remove ignore pattern
  cli([
    "project",
    "ignore",
    "remove",
    id,
    "--pattern",
    "**/AGENTS.md",
    "--yes",
  ]);
  await poll(getTree, (t) =>
    flatten(t.tree).some((entry) => entry.path.includes("AGENTS.md")),
  );

  // 9. Invalid config recovery: write corrupt config.json
  await mkdir(join(project, ".kairn"), { recursive: true });
  await writeFile(
    join(project, ".kairn", "config.json"),
    "temporarily invalid",
  );
  const treeDuringInvalid = await getTree();
  expect(treeDuringInvalid.tree.length).toBeGreaterThan(0);
  const docDuringInvalid = await getDoc(readmeEntry.id!);
  expect(docDuringInvalid.headings[0]?.title).toBe("Root");

  // Restore valid config
  await rm(join(project, ".kairn", "config.json"));

  // 10. Link resolution API
  const linkRes = await fetch(
    `${url}/api/links/${overviewId}/${encodeURIComponent("../README.md#configuration")}`,
  );
  expect(linkRes.status).toBe(200);
  const linkData = (await linkRes.json()) as { kind: string };
  expect(linkData.kind).toBe("document");

  // 11. Shutdown
  const exited = once(child, "exit");
  child.kill(process.platform === "win32" ? "SIGTERM" : "SIGINT");
  await exited;
  await expect(fetch(url + "/api/health")).rejects.toThrow();
}, 30000);
