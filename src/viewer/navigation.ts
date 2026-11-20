/** Browser-only URL state: legacy document IDs plus optional encoded heading fragment. */
export interface ReaderLocation {
  readonly id: string;
  readonly fragment: string;
}
/** Parse bookmarks without throwing or treating headings as document IDs. */
export function parseReaderLocation(hash: string): ReaderLocation | null {
  if (!hash || hash === "#") return null;
  const [id, ...parts] = hash.replace(/^#/, "").split("/");
  if (!id || !/^[a-f0-9]{64}$/.test(id)) return { id: "invalid", fragment: "" };
  try {
    return { id, fragment: decodeURIComponent(parts.join("/")) };
  } catch {
    return { id: "invalid", fragment: "" };
  }
}
/** Serialize shareable document/heading state, retaining legacy #id URLs when no heading is selected. */
export function readerHash(id: string, fragment = ""): string {
  return `#${id}${fragment ? "/" + encodeURIComponent(fragment) : ""}`;
}
