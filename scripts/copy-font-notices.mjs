import { copyFile } from "node:fs/promises";
for (const name of ["syne", "plus-jakarta-sans", "ibm-plex-mono"])
  await copyFile(
    new URL(
      `../src/frontend/styles/fonts/${name}-LICENSE.txt`,
      import.meta.url,
    ),
    new URL(`../dist/frontend/assets/${name}-LICENSE.txt`, import.meta.url),
  );
