import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("executable", () => {
  it("offers help", () => {
    expect(
      execFileSync(
        process.execPath,
        ["--experimental-strip-types", "src/index.ts", "--help"],
        { encoding: "utf8" },
      ),
    ).toContain("Usage: kairn");
  });
  it("reports the package version", () => {
    expect(
      execFileSync(
        process.execPath,
        ["--experimental-strip-types", "src/index.ts", "--version"],
        { encoding: "utf8" },
      ).trim(),
    ).toBe("0.1.0");
  });
});
