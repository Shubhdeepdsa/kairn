import { readdir, readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
const directory = new URL("../dist/frontend/", import.meta.url);
const html = await readFile(new URL("index.html", directory), "utf8");
const files = [];
for (const name of (await readdir(new URL("assets/", directory))).sort()) {
  const bytes = await readFile(new URL("assets/" + name, directory));
  files.push({ name, bytes: bytes.length, gzipBytes: gzipSync(bytes).length });
}
console.log(
  JSON.stringify(
    {
      htmlReferencedJavaScript: [
        ...html.matchAll(/(?:src|href)="([^\"]+\.js)"/g),
      ].map((m) => m[1]),
      totalJavaScriptBytes: files
        .filter((f) => f.name.endsWith(".js"))
        .reduce((n, f) => n + f.bytes, 0),
      totalCssBytes: files
        .filter((f) => f.name.endsWith(".css"))
        .reduce((n, f) => n + f.bytes, 0),
      files,
    },
    null,
    2,
  ),
);
