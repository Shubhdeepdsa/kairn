import type { DocumentEntry, NavigationEntry } from "../core/documents.js";

/** Mount and automatically refresh navigation every two seconds while visible. Returns cleanup for timers/listeners; fetch is injectable. */
export async function mountViewer(
  document: Document,
  fetcher: typeof fetch = fetch,
): Promise<() => void> {
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
  let disposed = false;
  let signature: string | undefined;
  let timer: number | undefined;
  let refreshing: Promise<void> | undefined;
  const window = document.defaultView;
  if (!window) throw new Error("Viewer needs a browser window.");
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
    if (disposed) return;
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
        details.dataset.path = node.path;
        const summary = document.createElement("summary");
        summary.textContent = node.title;
        details.append(summary, build(node.children));
        item.append(details);
      } else {
        files.set(node.id, node);
        byPath.set(`${node.sourceId ?? ""}:${node.path}`, node);
        if (node.projectPath) byPath.set(`project:${node.projectPath}`, node);
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
  const onNavigation = (event: MouseEvent): void => {
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
  };
  const onArticle = (event: MouseEvent): void => {
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
      let entry = byPath.get(
        `${selected.sourceId ?? ""}:${decodeURIComponent(target.pathname.slice(1))}`,
      );
      if (!entry && selected.projectPath) {
        const projectBase = `http://kairn.invalid/${selected.projectPath.split("/").map(encodeURIComponent).join("/")}`;
        const projectTarget = new URL(href, projectBase);
        entry = byPath.get(
          `project:${decodeURIComponent(projectTarget.pathname.slice(1))}`,
        );
      }
      if (target.origin === "http://kairn.invalid" && entry)
        void show(entry.id, target.hash);
      else
        status.textContent =
          "This link is not a Markdown document in the selected root.";
    } catch {
      status.textContent = "This documentation link is invalid.";
    }
  };
  navigation.addEventListener("click", onNavigation);
  article.addEventListener("click", onArticle);
  function refresh(initial = false): Promise<void> {
    refreshing ??= (async () => {
      try {
        const data = (await api("/api/tree")) as { tree: NavigationEntry[] };
        if (disposed) return;
        const nextSignature = JSON.stringify(data.tree);
        if (nextSignature === signature) {
          if (
            status!.textContent?.startsWith("Could not refresh documentation:")
          )
            status!.textContent = "";
          return;
        }
        const expanded = new Map(
          Array.from(
            navigation!.querySelectorAll<HTMLDetailsElement>(
              "details[data-path]",
            ),
            (folder) => [folder.dataset.path, folder.open],
          ),
        );
        const focused = (document.activeElement as HTMLElement | null)?.dataset
          .document;
        files.clear();
        byPath.clear();
        const list = build(data.tree);
        for (const folder of list.querySelectorAll<HTMLDetailsElement>(
          "details[data-path]",
        ))
          folder.open = expanded.get(folder.dataset.path) ?? true;
        navigation!.replaceChildren(list);
        signature = nextSignature;
        if (selected && files.has(selected.id)) {
          selected = files.get(selected.id);
          for (const link of navigation!.querySelectorAll<HTMLAnchorElement>(
            "a[data-document]",
          )) {
            if (link.dataset.document === selected?.id)
              link.setAttribute("aria-current", "page");
            if (link.dataset.document === focused)
              link.focus({ preventScroll: true });
          }
          if (
            status!.textContent?.startsWith("Could not refresh documentation:")
          )
            status!.textContent = "";
          return;
        }
        requestNumber++;
        selected = undefined;
        article!.replaceChildren();
        article!.removeAttribute("aria-busy");
        source!.textContent = "";
        if (!files.size) {
          status!.textContent =
            "No Markdown documents found. Add .md files; the sidebar updates automatically.";
          return;
        }
        const bookmark = initial ? window!.location.hash.slice(1) : undefined;
        const first = byPath.get(":README.md") ?? files.values().next().value;
        await show(bookmark || first!.id);
      } catch (error) {
        if (!disposed)
          status!.textContent = `Could not refresh documentation: ${error instanceof Error ? error.message : "Request failed."}`;
      }
    })().finally(() => {
      refreshing = undefined;
    });
    return refreshing;
  }
  function schedule(): void {
    if (disposed || document.hidden) return;
    if (timer !== undefined) window!.clearTimeout(timer);
    timer = window!.setTimeout(() => {
      timer = undefined;
      void refresh().finally(schedule);
    }, 2000);
  }
  function visibilityChanged(): void {
    if (timer !== undefined) {
      window!.clearTimeout(timer);
      timer = undefined;
    }
    if (!document.hidden && !disposed) void refresh().finally(schedule);
  }
  function dispose(): void {
    disposed = true;
    requestNumber++;
    if (timer !== undefined) window!.clearTimeout(timer);
    navigation!.removeEventListener("click", onNavigation);
    article!.removeEventListener("click", onArticle);
    document.removeEventListener("visibilitychange", visibilityChanged);
    window!.removeEventListener("pagehide", dispose);
  }
  document.addEventListener("visibilitychange", visibilityChanged);
  window.addEventListener("pagehide", dispose);
  status.textContent = "Loading documentation…";
  await refresh(true);
  schedule();
  return dispose;
}

if (typeof document !== "undefined" && document.getElementById("navigation"))
  void mountViewer(document);
