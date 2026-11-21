import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
/** Install the actual packed CLI offline from the committed graph, with no development dependencies or install scripts. Caller owns fixture cleanup. */
export async function installPackedKairn(
  root: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ binary: string; install: string }> {
  function command(binary: string, args: string[], cwd = root): string {
    return execFileSync(process.execPath, [binary, ...args], {
      cwd,
      env,
      encoding: "utf8",
    });
  }
  const npm = join(dirname(process.env.npm_execpath!), "npm-cli.js");
  const packed = JSON.parse(
    command(npm, ["pack", "--json", "--pack-destination", root], resolve(".")),
  )[0] as { filename: string; integrity: string };
  // npm ci warms tarballs but need not cache registry packuments. Preserve the
  // committed dependency graph so the acceptance install needs no registry metadata.
  const manifest = JSON.parse(
    await readFile(resolve("package.json"), "utf8"),
  ) as {
    version: string;
    dependencies: Record<string, string>;
    bin: Record<string, string>;
    engines: Record<string, string>;
    license: string;
  };
  const locked = JSON.parse(
    await readFile(resolve("package-lock.json"), "utf8"),
  ) as { packages: Record<string, unknown> };
  const tarball = pathToFileURL(join(root, packed.filename)).href;
  const install = join(root, "install");
  await mkdir(install);
  const fixture = {
    name: "kairn-installed-acceptance",
    version: "0.0.0",
    private: true,
    dependencies: { kairn: tarball },
  };
  const packages = { ...locked.packages };
  packages[""] = {
    name: fixture.name,
    version: fixture.version,
    dependencies: fixture.dependencies,
  };
  packages["node_modules/kairn"] = {
    version: manifest.version,
    resolved: tarball,
    integrity: packed.integrity,
    dependencies: manifest.dependencies,
    bin: manifest.bin,
    engines: manifest.engines,
    license: manifest.license,
  };
  await writeFile(join(install, "package.json"), JSON.stringify(fixture));
  await writeFile(
    join(install, "package-lock.json"),
    JSON.stringify({
      name: fixture.name,
      version: fixture.version,
      lockfileVersion: 3,
      requires: true,
      packages,
    }),
  );
  command(npm, [
    "ci",
    "--prefix",
    install,
    "--omit=dev",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--offline",
  ]);
  const binary = join(install, "node_modules", "kairn", "dist", "index.js");
  return { binary, install };
}
