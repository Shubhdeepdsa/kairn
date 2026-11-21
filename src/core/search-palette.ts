import type {
  SearchProject,
  SearchScope,
  SearchRequest,
  SearchResponse,
  SearchResult,
  ProjectCoverage,
} from "./search-contracts.js";
/** Framework-independent immutable view state; query and project scope are distinct fields. */
export interface PaletteState {
  readonly open: boolean;
  /** Project rows appear for an explicit selector or an empty global palette. */
  readonly projectChoices: boolean;
  readonly scope: SearchScope;
  readonly query: string;
  readonly picker: {
    readonly start: number;
    readonly end: number;
    readonly filter: string;
  } | null;
  readonly highlighted: number;
  readonly phase: "idle" | "loading" | "ready" | "error";
  readonly message: string;
  readonly results: readonly SearchResult[];
  readonly coverage: readonly ProjectCoverage[];
  readonly suggestions: readonly SearchProject[];
}
/** Navigation intents are separate from scope changes and are executed by the reader adapter. */
export type PaletteSelection =
  | { readonly kind: "close" }
  | { readonly kind: "project"; readonly projectId: string }
  | { readonly kind: "document"; readonly destination: SearchResult };
/** Injectable search boundary; no DOM, React, SQLite or filesystem ownership. */
export interface PaletteCapabilities {
  search(request: SearchRequest): Promise<SearchResponse>;
  changed(state: PaletteState): void;
}
/** Contextual scope/query/selection state with debounce and generation guards against stale replies. */
export class SearchPalette {
  private projects: readonly SearchProject[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;
  private force = false;
  private value: PaletteState = {
    open: false,
    projectChoices: false,
    scope: { type: "global" },
    query: "",
    picker: null,
    highlighted: 0,
    phase: "idle",
    message: "",
    results: [],
    coverage: [],
    suggestions: [],
  };
  constructor(
    private readonly capabilities: PaletteCapabilities,
    private readonly debounceMs = 200,
  ) {}
  get state(): PaletteState {
    return this.value;
  }
  private update(patch: Partial<PaletteState>): void {
    const next = { ...this.value, ...patch };
    this.value = {
      ...next,
      projectChoices:
        next.open &&
        (Boolean(next.picker) ||
          (next.scope.type === "global" && !next.query.trim())),
    };
    this.capabilities.changed(this.value);
  }
  setProjects(projects: readonly SearchProject[]): void {
    this.projects = [...projects].sort(
      (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
    );
    this.suggest();
  }
  /** Opening inside a reader defaults to its current project; Library opening is global. */
  open(project?: SearchProject): void {
    this.invalidate();
    this.update({
      open: true,
      scope: project
        ? { type: "project", projectId: project.id }
        : { type: "global" },
      query: "",
      picker: null,
      highlighted: 0,
      results: [],
      coverage: [],
      phase: "idle",
      message: "",
    });
    this.suggest();
    this.schedule();
  }
  close(): void {
    this.invalidate();
    this.update({ open: false, picker: null });
  }
  /** Cursor-aware project selection is recognized only in global mode; ordinary text stays query text. */
  setQuery(query: string, caret = query.length): void {
    const scope = this.value.scope;
    const match =
      scope.type === "global"
        ? /(?:^|\s)@([^\s@]*)$/.exec(query.slice(0, caret))
        : null;
    const start = match ? query.slice(0, caret).lastIndexOf("@") : 0;
    const end = caret + (query.slice(caret).match(/^[^\s@]*/)?.[0].length ?? 0);
    this.invalidate();
    this.update({
      query,
      picker: match
        ? { start, end, filter: query.slice(start + 1, end) }
        : null,
      highlighted: 0,
      results: [],
      coverage: [],
      phase: "idle",
      message: "",
    });
    this.suggest();
    if (!match) this.schedule();
  }
  removeScope(): void {
    this.invalidate();
    this.update({
      scope: { type: "global" },
      picker: null,
      results: [],
      coverage: [],
      highlighted: 0,
    });
    this.suggest();
    this.schedule();
  }
  /** Return true only when the adapter should consume Backspace; IME/text selection always edits normally. */
  backspace(start: number, end: number, composing: boolean): boolean {
    if (
      !composing &&
      start === 0 &&
      end === 0 &&
      this.value.query === "" &&
      this.value.scope.type === "project"
    ) {
      this.removeScope();
      return true;
    }
    return false;
  }
  selectProject(projectId: string): void {
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) return;
    const { picker, query } = this.value;
    const next = picker
      ? (query.slice(0, picker.start) + query.slice(picker.end))
          .trim()
          .replace(/\s{2,}/g, " ")
      : query;
    this.invalidate();
    this.update({
      scope: { type: "project", projectId },
      query: next,
      picker: null,
      highlighted: 0,
      results: [],
      coverage: [],
      message: "",
    });
    this.schedule();
  }
  /** Escape dismisses suggestions before the containing palette. */
  escape(): void {
    if (this.value.picker) {
      this.invalidate();
      this.update({ picker: null, highlighted: 0 });
    } else this.close();
  }
  move(delta: number): void {
    const count = this.value.projectChoices
      ? this.value.suggestions.length
      : this.value.results.length;
    if (count)
      this.update({
        highlighted: (this.value.highlighted + delta + count) % count,
      });
  }
  /** Empty scoped Enter dismisses; empty project selection navigates; selectors with terms only change scope. */
  choose(): PaletteSelection | undefined {
    const state = this.value;
    if (state.projectChoices) {
      const project = state.suggestions[state.highlighted];
      if (!project) return;
      const terms = state.picker
        ? (
            state.query.slice(0, state.picker.start) +
            state.query.slice(state.picker.end)
          ).trim()
        : state.query.trim();
      if (!terms) {
        this.close();
        return { kind: "project", projectId: project.id };
      }
      this.selectProject(project.id);
      return;
    }
    if (!state.query.trim()) {
      this.close();
      return { kind: "close" };
    }
    const result = state.results[state.highlighted];
    if (result) {
      this.close();
      return { kind: "document", destination: result };
    }
  }
  /** Explicit refresh continues bounded indexing without a second polling loop. */
  refresh(): void {
    this.force = true;
    this.invalidate();
    this.schedule();
  }
  private suggest(): void {
    const filter =
      this.value.picker?.filter.normalize("NFKC").toLowerCase() ?? "";
    const suggestions = this.projects.filter((p) =>
      p.name.normalize("NFKC").toLowerCase().includes(filter),
    );
    this.update({
      suggestions,
      highlighted: Math.min(
        this.value.highlighted,
        Math.max(0, suggestions.length - 1),
      ),
    });
  }
  private invalidate(): void {
    this.generation++;
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
  }
  private schedule(): void {
    if (!this.value.open || this.value.picker) return;
    if (!this.value.query.trim()) {
      this.force = false;
      this.update({
        phase: "idle",
        message:
          this.value.scope.type === "project"
            ? "Press Enter to return to the reader, or remove the project to switch."
            : "Choose a project with arrow keys and Enter, or type to search.",
      });
      return;
    }
    const generation = this.generation;
    this.update({
      phase: "loading",
      message: "Searching approved documentation…",
    });
    this.timer = setTimeout(() => {
      this.timer = undefined;
      const request: SearchRequest = {
        query: this.value.query,
        scope: this.value.scope,
        limit: 20,
        ...(this.force ? { refresh: true } : {}),
      };
      this.force = false;
      void this.capabilities
        .search(request)
        .then((response) => {
          if (generation !== this.generation || !this.value.open) return;
          this.update({
            results: response.results,
            coverage: response.coverage,
            phase: "ready",
            message: response.coverage.some((p) => p.status !== "ready")
              ? "Search coverage is incomplete. Refresh to continue or check unavailable projects."
              : response.results.length
                ? `${response.results.length} results`
                : this.value.query.trim()
                  ? "No results in the searched projects."
                  : "Type to search documentation.",
          });
        })
        .catch(() => {
          if (generation === this.generation && this.value.open)
            this.update({
              phase: "error",
              results: [],
              message:
                "Search is unavailable. Retry or check project configuration.",
            });
        });
    }, this.debounceMs);
  }
  /** Cancel timers and invalidate replies; the owner closes its transport separately. */
  dispose(): void {
    this.invalidate();
    this.value = { ...this.value, open: false, projectChoices: false };
  }
}
