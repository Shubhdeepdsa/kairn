import { expect, it } from "vitest";
import {
  parseReaderLocation,
  readerHash,
} from "../src/core/reader-location.js";
it("round-trips document/heading state and legacy IDs without guessing paths", () => {
  const id = "a".repeat(64);
  expect(parseReaderLocation("#" + id)).toEqual({ id, fragment: "" });
  for (const fragment of ["runtime-model", "日本語", "repeated-1", "a/b"])
    expect(parseReaderLocation(readerHash(id, fragment))).toEqual({
      id,
      fragment,
    });
  expect(parseReaderLocation("#" + id + "/%zz")?.id).toBe("invalid");
  expect(parseReaderLocation("#unknown")?.id).toBe("invalid");
  expect(parseReaderLocation("")).toBeNull();
});
