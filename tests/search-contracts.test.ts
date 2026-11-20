import { expect, it } from "vitest";
import { isProjectId } from "../src/core/search-contracts.js";
it("accepts only portable opaque registered/session identities, never project names or paths", () => {
  expect(isProjectId("6d7d4054-782f-439f-a956-e4b4f9f9d6a2")).toBe(true);
  expect(isProjectId("session-" + "a".repeat(32))).toBe(true);
  for (const value of [
    "../docs",
    "/tmp/project",
    "Project name",
    "",
    "session-x",
  ])
    expect(isProjectId(value)).toBe(false);
});
