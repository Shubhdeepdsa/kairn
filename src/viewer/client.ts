import { parseReaderLocation, readerHash } from "./navigation.js";
import type { Heading } from "../core/markdown.js";
import type { LinkResolution } from "../core/document-links.js";
import type { LinkDiagnostic } from "../core/document-links.js";
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
  let linkNumber = 0;
  let activeFragment = "";
  let outlineSignature = "";
  let configurationWarning: string | undefined;
  let contentRevision: string | undefined;
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
    const heading = Array.from(
      article!.querySelectorAll<HTMLElement>("[id]"),
    ).find((element) => element.id === id);
    if (heading && article?.contains(heading)) heading.scrollIntoView?.();
  }
  async function show(
    id: string,
    fragment = "",
    background = false,
    history: "push" | "replace" | "none" = "push",
  ): Promise<void> {
    if (disposed) return;
    const file =
      files.get(id) ??
      [...files.values()].find((entry) => entry.legacyId === id);
    if (file) id = file.id;
    if (!file) {
      status!.textContent =
        "Document was not found in this documentation root.";
      return;
    }
    const current = ++requestNumber;
    if (!background) {
      contentRevision = undefined;
      status!.textContent = "Loading document…";
      article!.setAttribute("aria-busy", "true");
      article!.replaceChildren();
    }
    selected = file;
    source!.textContent = file.projectPath ?? file.path;
    for (const link of navigation!.querySelectorAll<HTMLAnchorElement>(
      "a[data-document]",
    )) {
      if (link.dataset.document === id)
        link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
    if (!background) {
      activeFragment = fragment;
      if (history !== "none") {
        const hash = readerHash(id, fragment);
        if (window!.location.hash !== hash)
          window!.history[history === "push" ? "pushState" : "replaceState"](
            null,
            "",
            hash,
          );
      }
    }
    try {
      const response = await fetcher(`/api/documents/${id}`, {
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          ...(background && contentRevision
            ? { "If-None-Match": `"${contentRevision}"` }
            : {}),
        },
      });
      if (current !== requestNumber) return;
      if (response.status === 304) {
        if (status!.textContent?.startsWith("Could not refresh document:"))
          status!.textContent = "";
        return;
      }
      const data = (await response.json()) as {
        html: string;
        revision?: string;
        diagnostics?: readonly LinkDiagnostic[];
        headings?: readonly Heading[];
        error?: { message: string };
      };
      if (!response.ok)
        throw new Error(data.error?.message ?? "Document could not be read.");
      if (current !== requestNumber) return;
      // HTML comes only from the server's restricted Markdown renderer, never source HTML.
      const scroll = window!.scrollY;
      const changed = !background || article!.innerHTML !== data.html;
      if (changed) article!.innerHTML = data.html;
      contentRevision = data.revision;
      const outline = document.getElementById("outline");
      const headingSignature = JSON.stringify([id, data.headings]);
      if (outline && headingSignature !== outlineSignature) {
        const list = document.createElement("ul");
        for (const heading of data.headings ?? []) {
          const item = document.createElement("li");
          const link = document.createElement("a");
          link.textContent = heading.title;
          link.href = readerHash(id, heading.fragment);
          link.dataset.heading = heading.fragment;
          link.className = `level-${heading.level}`;
          item.append(link);
          list.append(item);
        }
        outline.replaceChildren(list);
        outlineSignature = headingSignature;
        const details = document.getElementById("document-outline");
        if (details) details.hidden = !data.headings?.length;
      }
      const warnings = document.getElementById("diagnostics");
      if (warnings) {
        warnings.replaceChildren();
        for (const diagnostic of data.diagnostics ?? []) {
          const line = document.createElement("p");
          line.textContent = `${diagnostic.message}${diagnostic.target ? ` (${diagnostic.target})` : ""}`;
          warnings.append(line);
        }
        warnings.hidden = !warnings.childNodes.length;
      }
      status!.textContent = configurationWarning ?? "";
      document.title = `${file.title} · Kairn`;
      if (!background) {
        article!.focus({ preventScroll: true });
        showFragment(fragment);
      } else if (changed) {
        if (activeFragment && document.getElementById(activeFragment))
          showFragment(activeFragment);
        else if (scroll > 0) window!.scrollTo(0, scroll);
      }
    } catch (error) {
      if (current === requestNumber)
        status!.textContent =
          (background ? "Could not refresh document: " : "") +
          (error instanceof Error ? error.message : "Could not load document.");
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
    const originating = selected.id;
    const currentLink = ++linkNumber;
    void (async () => {
      try {
        const result = (await api(
          `/api/links/${originating}/${encodeURIComponent(href)}`,
        )) as LinkResolution;
        if (
          disposed ||
          selected?.id !== originating ||
          currentLink !== linkNumber
        )
          return;
        if (result.kind === "diagnostic") {
          status.textContent = result.diagnostic.message;
          return;
        }
        if (result.kind === "document") {
          if (result.id === selected.id) {
            activeFragment = result.fragment;
            window!.history.pushState(
              null,
              "",
              readerHash(result.id, result.fragment),
            );
            showFragment(result.fragment);
          } else await show(result.id, result.fragment);
        }
      } catch (error) {
        if (!disposed && selected?.id === originating)
          status.textContent =
            error instanceof Error
              ? error.message
              : "Link could not be resolved.";
      }
    })();
  };
  navigation.addEventListener("click", onNavigation);
  article.addEventListener("click", onArticle);
  function refresh(initial = false): Promise<void> {
    refreshing ??= (async () => {
      try {
        const data = (await api("/api/tree")) as {
          tree: NavigationEntry[];
          warning?: string;
        };
        if (disposed) return;
        configurationWarning = data.warning;
        if (data.warning) status!.textContent = data.warning;
        else if (status!.textContent?.startsWith("Project configuration"))
          status!.textContent = "";
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
        const removed = selected !== undefined;
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
        const bookmark = initial
          ? parseReaderLocation(window!.location.hash)
          : null;
        const first = byPath.get(":README.md") ?? files.values().next().value;
        await show(
          bookmark?.id ?? first!.id,
          bookmark?.fragment ?? "",
          false,
          "replace",
        );
        if (removed)
          status!.textContent =
            "The previous document was removed or excluded; showing another available document.";
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
      void refresh()
        .then(() => (selected ? show(selected.id, "", true) : undefined))
        .finally(schedule);
    }, 2000);
  }
  function visibilityChanged(): void {
    if (timer !== undefined) {
      window!.clearTimeout(timer);
      timer = undefined;
    }
    if (!document.hidden && !disposed)
      void refresh()
        .then(() => (selected ? show(selected.id, "", true) : undefined))
        .finally(schedule);
  }
  const outline = document.getElementById("outline");
  const onOutline = (event: MouseEvent): void => {
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>(
      "a[data-heading]",
    );
    if (
      !link ||
      !selected ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    activeFragment = link.dataset.heading ?? "";
    window!.history.pushState(
      null,
      "",
      readerHash(selected.id, activeFragment),
    );
    showFragment(activeFragment);
  };
  outline?.addEventListener("click", onOutline);
  function restoreLocation(): void {
    const location = parseReaderLocation(window!.location.hash);
    if (location) void show(location.id, location.fragment, false, "none");
  }
  window.addEventListener("popstate", restoreLocation);
  window.addEventListener("hashchange", restoreLocation);
  function dispose(): void {
    disposed = true;
    linkNumber++;
    requestNumber++;
    if (timer !== undefined) window!.clearTimeout(timer);
    navigation!.removeEventListener("click", onNavigation);
    article!.removeEventListener("click", onArticle);
    outline?.removeEventListener("click", onOutline);
    document.removeEventListener("visibilitychange", visibilityChanged);
    window!.removeEventListener("pagehide", dispose);
    window!.removeEventListener("popstate", restoreLocation);
    window!.removeEventListener("hashchange", restoreLocation);
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
