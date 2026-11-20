#!/usr/bin/env node
import { parseArgs } from "node:util";
import { createRequire } from "node:module";
import { intro, log, outro, text, isCancel } from "@clack/prompts";
import { runInit } from "./cli/init.js";
import { clackPrompts } from "./cli/prompts.js";

import { runDocumentation } from "./cli/run.js";
import { loadViewerPresentation } from "./viewer/assets.js";
import open from "open";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };
const help = `Kairn — local-first Markdown documentation

Usage: kairn [--help | --version]
       kairn init [--cwd <directory>] [--yes]
       kairn run [--cwd <directory>] [--port <number>] [--no-open]

run         Read existing Markdown in a localhost browser viewer
--port      Loopback port (default: 4173; 0 selects an available port)
--no-open   Print the URL without opening a browser
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
      port: { type: "string" },
      "no-open": { type: "boolean" },
    },
  });
  if (
    positionals.length > 1 ||
    (positionals[0] !== undefined &&
      positionals[0] !== "init" &&
      positionals[0] !== "run")
  )
    throw new Error("Unknown command. Use kairn --help.");
  if (
    positionals[0] !== "run" &&
    (values.port !== undefined || values["no-open"])
  )
    throw new Error("--port and --no-open require run.");
  if (positionals[0] === "run" && values.yes)
    throw new Error("--yes is only supported for init.");
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
  } else if (positionals[0] === "run") {
    const port = values.port ?? "4173";
    if (!/^(0|[1-9]\d{0,4})$/.test(port) || Number(port) > 65535)
      throw new Error("Port must be an integer from 0 to 65535.");
    const interactive = Boolean(
      process.stdin.isTTY &&
      process.stdout.isTTY &&
      !process.env.CI &&
      process.env.TERM !== "dumb",
    );
    const canOpenBrowser =
      interactive &&
      (process.platform !== "linux" ||
        Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY));
    const controller = new AbortController();
    const stop = (): void => controller.abort();
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
    try {
      process.exitCode = await runDocumentation({
        directory: values.cwd ?? process.cwd(),
        port: Number(port),
        noOpen: values["no-open"] ?? false,
        interactive,
        canOpenBrowser,
        signal: controller.signal,
        viewer: await loadViewerPresentation(),
        async chooseRoot() {
          const answer = await text({
            message: "Existing documentation directory (blank cancels)",
            placeholder: "./notes",
          });
          return isCancel(answer) || !answer.trim() ? null : answer;
        },
        async openBrowser(url) {
          await open(url, { wait: false });
        },
        message: (value) => {
          if (interactive) log.info(value);
          else console.log(value);
        },
      });
    } finally {
      process.off("SIGINT", stop);
      process.off("SIGTERM", stop);
    }
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
