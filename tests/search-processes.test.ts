import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { it, expect } from "vitest";
import { SearchIndex } from "../src/core/search-index.js";
it("coordinates independent process writers and recovers a transaction interrupted by process exit", async () => {
  const root = await mkdtemp(join(tmpdir(), "kairn-search-process-"));
  const initial = await SearchIndex.open(root);
  initial.close();
  const module = new URL("../dist/core/search-index.js", import.meta.url).href;
  function child(
    source: string,
    args: string[] = [],
  ): Promise<{ code: number | null; error: string }> {
    return new Promise((resolve, reject) => {
      const processChild = spawn(
        process.execPath,
        ["--input-type=module", "-e", source, root, ...args],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
      let error = "";
      processChild.stderr.on("data", (d) => (error += String(d)));
      processChild.once("error", reject);
      processChild.once("exit", (code) => resolve({ code, error }));
    });
  }
  try {
    const source = `import {SearchIndex} from ${JSON.stringify(module)};const index=await SearchIndex.open(process.argv[1]);index.put({projectId:'p',documentId:process.argv[2],sourceId:'docs',path:'README.md',title:'Title',revision:'1',markdown:'# Title\\n\\nAuthentication'});index.close();`;
    const results = await Promise.all([
      child(source, ["one"]),
      child(source, ["two"]),
    ]);
    for (let i = 0; i < results.length; i++) {
      const result = results[i]!;
      if (result.code !== 0) {
        // Bounded SQLITE_BUSY is a supported response, not corruption. Wait for
        // both competing processes to exit, then explicitly retry that writer.
        expect(result.error).toMatch(
          /database is locked|database table is locked/,
        );
        const retried = await child(source, [i === 0 ? "one" : "two"]);
        expect(retried.code, retried.error).toBe(0);
      }
    }
    const crash = await child(
      `import {SearchIndex} from ${JSON.stringify(module)};const index=await SearchIndex.open(process.argv[1]);index.database.exec('BEGIN IMMEDIATE; DELETE FROM documents; DELETE FROM sections;');process.exit(9);`,
    );
    expect(crash.code).toBe(9);
    const recovered = await SearchIndex.open(root);
    try {
      expect(
        recovered.database.prepare("SELECT count(*) n FROM documents").get()!.n,
      ).toBe(2);
      expect(
        recovered.database.prepare("SELECT count(*) n FROM sections").get()!.n,
      ).toBe(2);
    } finally {
      recovered.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
