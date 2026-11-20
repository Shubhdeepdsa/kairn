import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runInit } from "../src/cli/init.js";
import type { InitPrompts } from "../src/cli/init.js";
const roots: string[] = [];
async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "kairn-cli-"));
  roots.push(root);
  return root;
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
const approved: InitPrompts = {
  choose: async () => "continue",
  confirm: async () => true,
};

describe("wizard adapter", () => {
  it.each(["choice", "sentinel", "declined", "confirmation-sentinel"])(
    "makes no changes on %s",
    async (stage) => {
      const directory = await fixture();
      const prompts: InitPrompts = {
        choose: async () =>
          stage === "choice"
            ? "cancel"
            : stage === "sentinel"
              ? null
              : "continue",
        confirm: async () => (stage === "confirmation-sentinel" ? null : false),
      };
      expect(
        await runInit({
          directory,
          prompts,
          yes: false,
          interactive: true,
          message: () => {},
        }),
      ).toBe(2);
      expect(await readdir(directory)).toEqual([]);
    },
  );
  it("previews before approval, then creates and reuses", async () => {
    const directory = await fixture();
    const messages: string[] = [];
    const prompts: InitPrompts = {
      ...approved,
      confirm: async () => {
        expect(messages.join("\n")).toContain("Preview: create");
        expect(await readdir(directory)).toEqual([]);
        return true;
      },
    };
    expect(
      await runInit({
        directory,
        prompts,
        yes: false,
        interactive: true,
        message: (text) => messages.push(text),
      }),
    ).toBe(0);
    expect(
      await runInit({
        directory,
        prompts: approved,
        yes: false,
        interactive: true,
        message: () => {},
      }),
    ).toBe(0);
  });
  it("requires explicit yes without a terminal", async () => {
    const directory = await fixture();
    await expect(
      runInit({
        directory,
        prompts: approved,
        yes: false,
        interactive: false,
        message: () => {},
      }),
    ).rejects.toThrow("--yes");
    expect(await readdir(directory)).toEqual([]);
  });
  it("never calls prompts with yes", async () => {
    const directory = await fixture();
    const fail = async (): Promise<never> => {
      throw new Error("Prompt called");
    };
    expect(
      await runInit({
        directory,
        prompts: { choose: fail, confirm: fail },
        yes: true,
        interactive: false,
        message: () => {},
      }),
    ).toBe(0);
  });
});

describe("built package executable", () => {
  it("runs help, version and repeated init from compiled output", async () => {
    const directory = await fixture();
    const binary = resolve("dist/index.js");
    expect(
      execFileSync(process.execPath, [binary, "--help"], { encoding: "utf8" }),
    ).toContain("kairn init");
    expect(
      execFileSync(process.execPath, [binary, "--version"], {
        encoding: "utf8",
      }).trim(),
    ).toBe("0.1.0");
    for (let i = 0; i < 2; i++) {
      const result = spawnSync(
        process.execPath,
        [binary, "init", "--cwd", directory, "--yes"],
        { encoding: "utf8", env: { ...process.env, NO_COLOR: "1", CI: "1" } },
      );
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).not.toContain("\u001b[");
    }
    expect(await readdir(directory)).toEqual(["docs"]);
    expect(await readdir(join(directory, "docs"))).toEqual([]);
  });
  it("fails unsupported commands, flags and noninteractive init", async () => {
    const directory = await fixture();
    for (const args of [
      ["unknown-command"],
      ["--bogus"],
      ["--yes"],
      ["init", "--cwd", directory],
    ]) {
      expect(
        spawnSync(process.execPath, [resolve("dist/index.js"), ...args], {
          encoding: "utf8",
        }).status,
      ).toBe(1);
    }
    expect(await readdir(directory)).toEqual([]);
  });
  it("reports missing paths", async () => {
    const directory = await fixture();
    await mkdir(join(directory, "docs"));
    const result = spawnSync(
      process.execPath,
      [
        resolve("dist/index.js"),
        "init",
        "--cwd",
        join(directory, "missing"),
        "--yes",
      ],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Kairn:");
  });
});
