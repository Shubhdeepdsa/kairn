#!/usr/bin/env node
import { parseArgs } from "node:util";
import { createRequire } from "node:module";
import { intro, log, outro } from "@clack/prompts";
import { runInit } from "./cli/init.js";
import { clackPrompts } from "./cli/prompts.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };
const help = `Kairn — local-first Markdown documentation

Usage: kairn [--help | --version]
       kairn init [--cwd <directory>] [--yes]

init        Safely create or reuse the direct docs/ directory
--cwd       Select an existing project directory (default: current directory)
--yes       Approve the safe default without prompts
-h, --help  Show help
-v, --version  Show version`;
try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
      yes: { type: "boolean" },
      cwd: { type: "string" },
    },
  });
  if (
    positionals.length > 1 ||
    (positionals[0] !== undefined && positionals[0] !== "init")
  )
    throw new Error("Unknown command. Use kairn --help.");
  if (values.version) console.log(version);
  else if (values.help) console.log(help);
  else if (positionals[0] === "init") {
    const interactive = Boolean(
      process.stdin.isTTY &&
      process.stdout.isTTY &&
      !process.env.CI &&
      process.env.TERM !== "dumb",
    );
    const decorated = interactive && !values.yes;
    if (decorated) intro("Kairn ◇ Documentation starts here");
    process.exitCode = await runInit({
      directory: values.cwd ?? process.cwd(),
      yes: values.yes ?? false,
      interactive,
      prompts: clackPrompts,
      message: (text) => {
        if (decorated) log.info(text);
        else console.log(text);
      },
    });
    if (decorated)
      outro(
        process.exitCode === 0
          ? "Ready for your next little milestone."
          : "Initialization canceled.",
      );
  } else {
    if (values.yes || values.cwd !== undefined)
      throw new Error("--yes and --cwd require init.");
    console.log(help);
  }
} catch (error) {
  console.error(
    `Kairn: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
