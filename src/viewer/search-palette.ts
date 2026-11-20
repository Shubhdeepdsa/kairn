import { SearchPalette } from "../core/search-palette.js";
import type { PaletteState } from "../core/search-palette.js";
import type {
  SearchProject,
  DocumentDestination,
  SearchResponse,
} from "../core/search-contracts.js";
/** Minimal DOM adapter over the reusable controller and independently supplied destination navigator. */
export function mountSearchPalette(
  document: Document,
  fetcher: typeof fetch,
  current: () => SearchProject | undefined,
  navigate: (destination: DocumentDestination) => Promise<void>,
): () => void {
  const trigger = document.getElementById("search-open");
  if (!trigger) return () => {};
  const overlay = document.createElement("div");
  overlay.className = "search-overlay";
  overlay.hidden = true;
  const dialog = document.createElement("section");
  dialog.className = "search-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", "Search documentation");
  overlay.append(dialog);
  const label = document.createElement("label");
  label.textContent = "Search documentation";
  label.htmlFor = "search-query";
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "search-chip";
  const input = document.createElement("input");
  input.id = "search-query";
  input.maxLength = 256;
  input.autocomplete = "off";
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", "search-results");
  input.setAttribute("aria-expanded", "false");
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const coverage = document.createElement("ul");
  coverage.className = "search-coverage";
  coverage.setAttribute("aria-label", "Index coverage");
  const results = document.createElement("ul");
  results.id = "search-results";
  results.setAttribute("role", "listbox");
  results.setAttribute("aria-label", "Search results");
  const refresh = document.createElement("button");
  refresh.type = "button";
  refresh.textContent = "Refresh search";
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "Close search";
  const help = document.createElement("p");
  help.className = "search-help";
  help.textContent =
    "↑↓ Navigate · Enter Open · Escape Close · Empty Backspace removes project · @ selects project";
  dialog.append(
    label,
    chip,
    input,
    status,
    results,
    coverage,
    refresh,
    close,
    help,
  );
  document.body.append(overlay);
  let projects: readonly SearchProject[] = [];
  let composing = false;
  let wasOpen = false;
  let focusBefore: HTMLElement | null = null;
  let disposed = false;
  let opening = 0;
  let request: AbortController | undefined;
  let projectRequest: AbortController | undefined;
  const inertBefore = new Map<Element, boolean>();
  function restore(): void {
    for (const [element, wasInert] of inertBefore)
      if (!wasInert) element.removeAttribute("inert");
    inertBefore.clear();
    focusBefore?.focus({ preventScroll: true });
  }
  function render(state: PaletteState): void {
    if (disposed) return;
    overlay.hidden = !state.open;
    if (state.open && !wasOpen) {
      focusBefore = document.activeElement as HTMLElement | null;
      for (const element of document.body.children)
        if (element !== overlay) {
          inertBefore.set(element, element.hasAttribute("inert"));
          element.setAttribute("inert", "");
        }
    }
    if (!state.open && wasOpen) restore();
    const justOpened = state.open && !wasOpen;
    wasOpen = state.open;
    if (!state.open) return;
    if (input.value !== state.query) {
      input.value = state.query;
      input.setSelectionRange(input.value.length, input.value.length);
    }
    const scope = state.scope;
    chip.hidden = scope.type === "global";
    if (scope.type === "project") {
      const name =
        projects.find((p) => p.id === scope.projectId)?.name ??
        (current()?.id === scope.projectId ? current()?.name : undefined) ??
        "Current project";
      chip.textContent = name + " ×";
      chip.setAttribute(
        "aria-label",
        `Remove ${name} scope; search all registered projects`,
      );
    }
    input.placeholder =
      scope.type === "global"
        ? "Search all registered projects; @ selects a project"
        : "Search this project";
    status.textContent = state.message;
    results.setAttribute("aria-busy", String(state.phase === "loading"));
    results.setAttribute(
      "aria-label",
      state.picker ? "Registered projects" : "Documentation results",
    );
    input.setAttribute(
      "aria-expanded",
      String(Boolean(state.picker) || state.results.length > 0),
    );
    results.replaceChildren();
    const choices = state.picker ? state.suggestions : state.results;
    choices.forEach((choice, index) => {
      const item = document.createElement("li");
      item.id = `search-option-${index}`;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(index === state.highlighted));
      const button = document.createElement("button");
      button.type = "button";
      button.tabIndex = -1;
      if (state.picker) {
        const project = choice as SearchProject;
        button.textContent = `${project.name} · ${project.id}`;
      } else {
        const result = choice as SearchResponse["results"][number];
        const title = document.createElement("strong");
        title.textContent =
          result.documentTitle + (result.heading ? " · " + result.heading : "");
        const path = document.createElement("span");
        path.textContent = `${result.projectName} · ${result.sourcePath}`;
        const snippet = document.createElement("span");
        snippet.textContent = result.snippet;
        button.append(title, path, snippet);
      }
      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("click", () => {
        controller.move(index - controller.state.highlighted);
        choose();
      });
      item.append(button);
      results.append(item);
    });
    if (choices.length)
      input.setAttribute(
        "aria-activedescendant",
        `search-option-${state.highlighted}`,
      );
    else input.removeAttribute("aria-activedescendant");
    if (state.picker && !choices.length)
      status.textContent = "No registered projects match this selector.";
    coverage.replaceChildren();
    for (const p of state.coverage) {
      if (p.status === "ready") continue;
      const line = document.createElement("li");
      line.textContent = `${p.name}: ${p.status} (${p.indexed}/${p.total})${p.message ? " — " + p.message : ""}`;
      coverage.append(line);
    }
    if (justOpened) input.focus();
  }
  const controller = new SearchPalette({
    changed: render,
    async search(search) {
      request?.abort();
      request = new AbortController();
      const params = new URLSearchParams({
        query: search.query,
        limit: String(search.limit),
      });
      if (search.scope.type === "project")
        params.set("project", search.scope.projectId);
      const response = await fetcher("/api/search?" + params, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: request.signal,
      });
      if (!response.ok) throw new Error("Search failed");
      return (await response.json()) as SearchResponse;
    },
  });
  function choose(): void {
    const result = controller.choose();
    input.focus();
    if (result) {
      controller.close();
      void navigate(result);
    }
  }
  function open(): void {
    if (controller.state.open) {
      input.focus();
      return;
    }
    const version = ++opening;
    controller.open(current());
    projectRequest?.abort();
    projectRequest = new AbortController();
    void fetcher("/api/projects", {
      credentials: "same-origin",
      signal: projectRequest.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Projects unavailable");
        const body = (await response.json()) as { projects: SearchProject[] };
        if (disposed || version !== opening) return;
        projects = body.projects;
        controller.setProjects(projects);
      })
      .catch(() => {
        if (!disposed && version === opening)
          status.textContent =
            "Project suggestions unavailable. Check the Library and retry.";
      });
  }
  const onInput = (): void => {
    if (!composing)
      controller.setQuery(
        input.value,
        input.selectionStart ?? input.value.length,
      );
  };
  const onCompositionStart = (): void => {
    composing = true;
  };
  const onCompositionEnd = (): void => {
    composing = false;
    onInput();
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.isComposing || composing) return;
    if (
      (event.metaKey || event.ctrlKey) &&
      !event.altKey &&
      event.key.toLowerCase() === "k"
    ) {
      event.preventDefault();
      open();
      return;
    }
    if (!controller.state.open) return;
    if (event.key === "Tab") {
      const controls = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([hidden]):not([tabindex="-1"]),input',
        ),
      );
      const first = controls[0],
        last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      controller.escape();
      return;
    }
    if (event.target !== input) return;
    if (
      event.key === "Backspace" &&
      controller.backspace(
        input.selectionStart ?? 0,
        input.selectionEnd ?? 0,
        event.isComposing,
      )
    ) {
      event.preventDefault();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      controller.move(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose();
    }
  };
  const onRemove = (): void => {
    controller.removeScope();
    input.focus();
  };
  const onRefresh = (): void => controller.refresh();
  const onClose = (): void => controller.close();
  trigger.addEventListener("click", open);
  document.addEventListener("keydown", onKey);
  input.addEventListener("input", onInput);
  input.addEventListener("compositionstart", onCompositionStart);
  input.addEventListener("compositionend", onCompositionEnd);
  chip.addEventListener("click", onRemove);
  refresh.addEventListener("click", onRefresh);
  close.addEventListener("click", onClose);
  return () => {
    disposed = true;
    opening++;
    request?.abort();
    projectRequest?.abort();
    controller.dispose();
    if (wasOpen) restore();
    trigger.removeEventListener("click", open);
    document.removeEventListener("keydown", onKey);
    overlay.remove();
  };
}
