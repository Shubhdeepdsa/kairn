import type { DocumentEntry, NavigationEntry } from "../core/documents.js";

/** Mount a viewer against its same-origin API; injected fetch enables deterministic DOM tests. */
export async function mountViewer(
  document: Document,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const navigation = document.getElementById("navigation");
  const article = document.getElementById("document");
  const status = document.getElementById("status");
  const source = document.getElementById("source");
  if (!navigation || !article || !status || !source)
    throw new Error("Viewer shell is incomplete.");
  const files = new Map<string, DocumentEntry>();
  const byPath = new Map<string, DocumentEntry>();
  let selected: DocumentEntry | undefined;
  let requestNumber = 0;
  async function api(path: string): Promise<unknown> {
    const response = await fetcher(path, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(
        "error" in data
          ? String(data.error.message)
          : "Documentation request failed.",
      );
    return data;
  }
  function showFragment(fragment: string): void {
    if (!fragment) return;
    let id: string;
    try {
      id = decodeURIComponent(fragment.replace(/^#/, ""));
    } catch {
      return;
    }
    const heading = document.getElementById(id);
    if (heading && article?.contains(heading)) heading.scrollIntoView?.();
  }
  async function show(id: string, fragment = ""): Promise<void> {
    const file = files.get(id);
    if (!file) {
      status!.textContent =
        "Document was not found in this documentation root.";
      return;
    }
    const current = ++requestNumber;
    status!.textContent = "Loading document…";
    article!.setAttribute("aria-busy", "true");
    article!.replaceChildren();
    selected = file;
    source!.textContent = file.path;
    for (const link of navigation!.querySelectorAll<HTMLAnchorElement>(
      "a[data-document]",
    )) {
      if (link.dataset.document === id)
        link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
    document.defaultView?.history.replaceState(null, "", `#${id}`);
    try {
      const data = (await api(`/api/documents/${id}`)) as { html: string };
      if (current !== requestNumber) return;
      // HTML comes only from the server's restricted Markdown renderer, never source HTML.
      article!.innerHTML = data.html;
      status!.textContent = "";
      document.title = `${file.title} · Kairn`;
      article!.focus({ preventScroll: true });
      showFragment(fragment);
    } catch (error) {
      if (current === requestNumber)
        status!.textContent =
          error instanceof Error ? error.message : "Could not load document.";
    } finally {
      if (current === requestNumber) article!.removeAttribute("aria-busy");
    }
  }
  function build(nodes: readonly NavigationEntry[]): HTMLUListElement {
    const list = document.createElement("ul");
    for (const node of nodes) {
      const item = document.createElement("li");
      if (node.kind === "directory") {
        const details = document.createElement("details");
        details.open = true;
        const summary = document.createElement("summary");
        summary.textContent = node.title;
        details.append(summary, build(node.children));
        item.append(details);
      } else {
        files.set(node.id, node);
        byPath.set(node.path, node);
        const link = document.createElement("a");
        link.href = `#${node.id}`;
        link.dataset.document = node.id;
        link.textContent = node.title;
        link.title = node.path;
        item.append(link);
      }
      list.append(item);
    }
    return list;
  }
  navigation.addEventListener("click", (event) => {
    const target = event.target as Element | null;
    const link = target?.closest<HTMLAnchorElement>("a[data-document]");
    if (
      !link ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    void show(link.dataset.document ?? "");
  });
  article.addEventListener("click", (event) => {
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>(
      "a",
    );
    if (!link || !selected) return;
    const href = link.getAttribute("href") ?? "";
    if (/^(https?:|mailto:)/i.test(href)) return;
    event.preventDefault();
    if (href.startsWith("#")) {
      showFragment(href);
      return;
    }
    try {
      const base = `http://kairn.invalid/${selected.path.split("/").map(encodeURIComponent).join("/")}`;
      const target = new URL(href, base);
      const entry = byPath.get(decodeURIComponent(target.pathname.slice(1)));
      if (target.origin === "http://kairn.invalid" && entry)
        void show(entry.id, target.hash);
      else
        status.textContent =
          "This link is not a Markdown document in the selected root.";
    } catch {
      status.textContent = "This documentation link is invalid.";
    }
  });
  status.textContent = "Loading documentation…";
  try {
    const data = (await api("/api/tree")) as { tree: NavigationEntry[] };
    navigation.replaceChildren(build(data.tree));
    if (!files.size) {
      status.textContent =
        "No Markdown documents found. Add .md files and restart Kairn.";
      return;
    }
    const initial = document.defaultView?.location.hash.slice(1);
    const first = byPath.get("README.md") ?? files.values().next().value;
    await show(initial || first!.id);
  } catch (error) {
    status.textContent =
      error instanceof Error ? error.message : "Could not load documentation.";
  }
}

if (typeof document !== "undefined" && document.getElementById("navigation"))
  void mountViewer(document);
