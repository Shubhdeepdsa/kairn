import { createHash } from "node:crypto";
/** Content-only revision for one bounded document; independent of timestamps and source presentation. */
export function documentRevision(markdown: string): string {
  return createHash("sha256").update(markdown).digest("hex");
}
