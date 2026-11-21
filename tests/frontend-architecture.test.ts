import { readdir, readFile } from "node:fs/promises";
import { resolve, dirname, relative } from "node:path";
import { builtinModules } from "node:module";
import { ESLint } from "eslint";
import ts from "typescript";
import { expect, it } from "vitest";
function portable(path: string): string {
  return path.replaceAll("\\", "/");
}
async function files(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory()
          ? files(portable(resolve(directory, e.name)))
          : Promise.resolve([portable(resolve(directory, e.name))]),
      ),
    )
  ).flat();
}
it("keeps the entire browser import closure Node-free and acyclic, with safe shared contracts only", async () => {
  const frontend = portable(resolve("src/frontend"));
  const all = (await files(frontend)).filter((p) => /\.(ts|tsx)$/.test(p));
  const known = new Set(await files(resolve("src")));
  const allowed = new Set([
    portable(resolve("src/core/search-contracts.ts")),
    portable(resolve("src/core/reader-location.ts")),
    portable(resolve("src/core/search-palette.ts")),
  ]);
  const packages = new Set([
    "react",
    "react-dom/client",
    "react-router",
    "lucide-react",
  ]);
  const edges = new Map<string, string[]>();
  async function visit(file: string): Promise<void> {
    if (edges.has(file)) return;
    const dependencies: string[] = [];
    edges.set(file, dependencies);
    const source = await readFile(file, "utf8");
    const ast = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const imports: string[] = [];
    function walk(node: ts.Node): void {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      )
        imports.push(node.moduleSpecifier.text);
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword
      ) {
        const arg = node.arguments[0];
        expect(arg && ts.isStringLiteral(arg)).toBe(true);
        if (arg && ts.isStringLiteral(arg)) imports.push(arg.text);
      }
      ts.forEachChild(node, walk);
    }
    walk(ast);
    for (const specifier of imports) {
      expect(
        specifier.startsWith("node:") || builtinModules.includes(specifier),
        file,
      ).toBe(false);
      if (!specifier.startsWith(".")) {
        expect(packages.has(specifier), `${file}: ${specifier}`).toBe(true);
        continue;
      }
      if (specifier.endsWith(".css")) continue;
      if (specifier.endsWith(".svg?no-inline")) {
        const asset = portable(
          resolve(dirname(file), specifier.split("?")[0]!),
        );
        expect(asset.startsWith(frontend + "/assets/brand/")).toBe(true);
        expect(known.has(asset)).toBe(true);
        const svg = await readFile(asset, "utf8");
        expect(svg).not.toMatch(/<script|<foreignObject|(?:href|src)=/i);
        continue;
      }
      const base = portable(
        resolve(dirname(file), specifier.replace(/\.js$/, "")),
      );
      const target = [base + ".ts", base + ".tsx"].find((p) => known.has(p));
      expect(target, `${file}: ${specifier}`).toBeTruthy();
      if (!target) continue;
      expect(
        target.startsWith(frontend + "/") || allowed.has(target),
        relative(resolve("src"), target),
      ).toBe(true);
      if (file.includes("/components/ui/"))
        expect(target.includes("/app/") || target.includes("/features/")).toBe(
          false,
        );
      dependencies.push(target);
      await visit(target);
    }
    if (file.startsWith(frontend)) {
      expect(source).not.toMatch(/#[0-9a-f]{3,8}\b|\b(?:rgb|hsl)a?\(/i);
      if (!file.includes("/lib/api/"))
        expect(source).not.toMatch(/\bfetch\s*\(/);
    }
  }
  for (const file of all) await visit(file);
  function cycles(file: string, path: string[]): void {
    expect(path.includes(file), path.join(" → ")).toBe(false);
    for (const dependency of edges.get(file) ?? [])
      cycles(dependency, [...path, file]);
  }
  for (const file of all) cycles(file, []);
});
it("rejects Node imports, page-level buttons, inline styles, direct icons and React in core", async () => {
  const lint = new ESLint();
  for (const [file, source] of [
    [
      "src/frontend/features/Probe.tsx",
      'import fs from "node:fs"; export const Probe=()=> <button style={{color:"red"}}>Bad</button>;',
    ],
    [
      "src/frontend/features/Probe.tsx",
      'import {Book} from "lucide-react"; export const Probe=()=> <Book/>;',
    ],
    [
      "src/core/probe.ts",
      'import {useState} from "react"; export const value=useState;',
    ],
  ]) {
    const result = await lint.lintText(source!, { filePath: file! });
    expect(result[0]?.errorCount).toBeGreaterThan(0);
  }
});
it("connects semantic Tailwind aliases and shared component styles to the same token owners", async () => {
  const css =
    (await readFile("src/frontend/styles/index.css", "utf8")) +
    (await readFile("src/frontend/styles/components.css", "utf8"));
  const tokens = await readFile("src/frontend/styles/tokens.css", "utf8");
  const themes = await readFile("src/frontend/styles/themes.css", "utf8");
  expect(css).toContain('@import "tailwindcss"');
  expect(css).toContain("@theme inline");
  for (const token of css.matchAll(/var\((--kairn-[\w-]+)\)/g))
    expect(tokens, token[1]).toContain(token[1] + ":");
  expect(css).toContain(".ui-button");
  expect(css).toContain(".sidebar");
  expect(themes).toContain("prefers-reduced-motion");
  expect(themes).toContain("prefers-color-scheme");
});

it("keeps primitive colors and shared control/layout styles out of feature CSS", async () => {
  const all = await files(resolve("src/frontend"));
  for (const file of all.filter((path) => path.endsWith(".css"))) {
    const source = await readFile(file, "utf8");
    if (!file.endsWith("/tokens.css") && !file.endsWith("/themes.css")) {
      expect(source, file).not.toMatch(/#[0-9a-f]{3,8}\b|\b(?:rgb|hsl)a?\(/i);
      expect(source, file).not.toContain("var(--mineral-");
    }
    expect(file).not.toContain("/features/");
  }
  const lint = new ESLint();
  for (const element of ["input", "select"]) {
    const results = await lint.lintText(
      `export const Bad=()=> <${element} aria-label="Bad"/>;`,
      { filePath: "src/frontend/features/Probe.tsx" },
    );
    expect(results[0]?.errorCount).toBeGreaterThan(0);
  }
});

it("keeps the packaged wordmark font-independent with outlined lettering", async () => {
  const svg = await readFile(
    "src/frontend/assets/brand/kairn-with-text.svg",
    "utf8",
  );
  expect(svg).not.toMatch(/<text\b|font-family|@font-face|<image\b|<use\b/i);
  expect([...svg.matchAll(/<path\s[^>]*d="[^"]+"/g)]).toHaveLength(5);
  expect(svg).toContain('viewBox="0 0 170 42"');
});
