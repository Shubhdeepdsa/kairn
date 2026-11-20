/** Browser-only URL state: legacy document IDs plus optional encoded heading fragment. */
export interface ReaderLocation {
  readonly id: string;
  readonly fragment: string;
  readonly projectId?: string;
}
/** Parse bookmarks without throwing or treating headings as document IDs. */
export function parseReaderLocation(hash: string): ReaderLocation | null {
  if (!hash || hash === "#") return null;
  const components = hash.replace(/^#/, "").split("/");
  const scoped = components[0] === "p";
  const projectId = scoped ? components[1] : undefined;
  const [id, ...parts] = scoped ? components.slice(2) : components;
  if (
    scoped &&
    (!projectId || !/^(?:[a-f0-9-]{36}|session-[a-f0-9]{32})$/.test(projectId))
  )
    return { id: "invalid", fragment: "" };
  if (!id || !/^[a-f0-9]{64}$/.test(id)) return { id: "invalid", fragment: "" };
  try {
    return {
      id,
      fragment: decodeURIComponent(parts.join("/")),
      ...(projectId ? { projectId } : {}),
    };
  } catch {
    return { id: "invalid", fragment: "" };
  }
}
/** Serialize shareable document/heading state, retaining legacy #id URLs when no heading is selected. */
export function readerHash(
  id: string,
  fragment = "",
  projectId?: string,
): string {
  return `#${projectId ? "p/" + projectId + "/" : ""}${id}${fragment ? "/" + encodeURIComponent(fragment) : ""}`;
}
