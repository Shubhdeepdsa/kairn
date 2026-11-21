import { readdir, readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { frontendAssetBudget } from "../dist/server/frontend-assets.js";

const directory = new URL("../dist/frontend/", import.meta.url);
const html = await readFile(new URL("index.html", directory), "utf8");
const htmlBytes = Buffer.byteLength(html);
const files = [];
for (const name of (await readdir(new URL("assets/", directory))).sort()) {
  const bytes = await readFile(new URL("assets/" + name, directory));
  files.push({ name, bytes: bytes.length, gzipBytes: gzipSync(bytes).length });
}
const totalLoadedBytes =
  htmlBytes +
  files
    .filter(
      (f) =>
        ![
          "syne-LICENSE.txt",
          "plus-jakarta-sans-LICENSE.txt",
          "ibm-plex-mono-LICENSE.txt",
        ].includes(f.name),
    )
    .reduce((n, f) => n + f.bytes, 0);

const largestAsset = files.reduce(
  (max, f) => (f.bytes > max.bytes ? f : max),
  files[0] ?? { name: "", bytes: 0 },
);

if (files.length > frontendAssetBudget.maxAssetCount) {
  console.error(
    `Asset budget exceeded: ${files.length} assets > ${frontendAssetBudget.maxAssetCount} limit`,
  );
  process.exit(1);
}
if (largestAsset.bytes > frontendAssetBudget.maxAssetBytes) {
  console.error(
    `Asset budget exceeded: ${largestAsset.name} is ${largestAsset.bytes} bytes > ${frontendAssetBudget.maxAssetBytes} limit`,
  );
  process.exit(1);
}
if (totalLoadedBytes > frontendAssetBudget.maxTotalBytes) {
  console.error(
    `Asset budget exceeded: total loaded size ${totalLoadedBytes} bytes > ${frontendAssetBudget.maxTotalBytes} limit`,
  );
  process.exit(1);
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
      totalFontBytes: files
        .filter((f) => f.name.endsWith(".woff2"))
        .reduce((n, f) => n + f.bytes, 0),
      initialJavaScriptBytes: files
        .filter((f) =>
          [...html.matchAll(/(?:src|href)="([^\"]+\.js)"/g)].some((m) =>
            m[1].endsWith(f.name),
          ),
        )
        .reduce((n, f) => n + f.bytes, 0),
      budget: {
        maxAssetCount: frontendAssetBudget.maxAssetCount,
        actualAssetCount: files.length,
        headroomAssetCount: frontendAssetBudget.maxAssetCount - files.length,
        maxAssetBytes: frontendAssetBudget.maxAssetBytes,
        largestAssetBytes: largestAsset.bytes,
        largestAssetName: largestAsset.name,
        headroomLargestAssetBytes:
          frontendAssetBudget.maxAssetBytes - largestAsset.bytes,
        maxTotalBytes: frontendAssetBudget.maxTotalBytes,
        actualTotalBytes: totalLoadedBytes,
        headroomTotalBytes:
          frontendAssetBudget.maxTotalBytes - totalLoadedBytes,
      },
      files,
    },
    null,
    2,
  ),
);
