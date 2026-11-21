import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { KeyboardEvent, ChangeEvent } from "react";
import { SearchPalette } from "../../../core/search-palette.js";
import type { PaletteState } from "../../../core/search-palette.js";
import type {
  SearchProject,
  NavigationDestination,
  SearchResult,
} from "../../../core/search-contracts.js";
import { useApiClient } from "../../app/providers/ApplicationProvider";
import { Icon } from "../../icons/Icon";
import { IconButton } from "../../components/ui/IconButton";
import { Button } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/TextInput";

export interface SearchPaletteDialogProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly activeProject?: SearchProject | undefined;
  readonly onNavigate: (destination: NavigationDestination) => void;
}

/**
 * React adapter over Kairn's framework-independent SearchPalette controller.
 * Preserves core query parsing, debounce, generation guards, project picker,
 * and keyboard navigation without creating a duplicate search state machine.
 */
export function SearchPaletteDialog({
  isOpen,
  onClose,
  activeProject,
  onNavigate,
}: SearchPaletteDialogProps) {
  const client = useApiClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const focusBeforeRef = useRef<HTMLElement | null>(null);

  const [state, setState] = useState<PaletteState>({
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
  });

  const [projects, setProjects] = useState<readonly SearchProject[]>([]);

  // Pure controller instance wired to typed API client boundary
  const controller = useMemo(
    () =>
      new SearchPalette(
        {
          search: (req) => client.search(req),
          changed: (nextState) => setState(nextState),
        },
        200,
      ),
    [client],
  );

  const choose = useCallback(() => {
    const selection = controller.choose();
    if (selection) {
      if (selection.kind === "project") {
        onNavigate({ projectId: selection.projectId });
        onClose();
      } else if (selection.kind === "document") {
        onNavigate(selection.destination);
        onClose();
      } else if (selection.kind === "close") {
        onClose();
      }
    }
  }, [controller, onNavigate, onClose]);

  // Global window listener for Escape ensures dismissal works immediately upon opening,
  // even before focus settles into the input or dialog container.
  useEffect(() => {
    if (!isOpen) return;

    const onGlobalKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        controller.escape();
        if (!controller.state.open) onClose();
      }
    };

    window.addEventListener("keydown", onGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", onGlobalKeyDown);
    };
  }, [isOpen, controller, onClose]);

  // Open/close synchronization with controller
  useEffect(() => {
    if (isOpen) {
      focusBeforeRef.current = document.activeElement as HTMLElement | null;
      controller.open(activeProject);

      // Focus input immediately upon opening, backed by animation frame
      inputRef.current?.focus();
      const frame = requestAnimationFrame(() => {
        inputRef.current?.focus();
      });

      // Fetch projects for project suggestions and chips
      client
        .getProjects()
        .then((fetchedProjects) => {
          setProjects(fetchedProjects);
          controller.setProjects(fetchedProjects);
        })
        .catch(() => {
          // Controlled degradation when project listing is unavailable
        });

      return () => {
        cancelAnimationFrame(frame);
        controller.dispose();
      };
    } else {
      controller.close();
      if (focusBeforeRef.current) {
        focusBeforeRef.current.focus({ preventScroll: true });
        focusBeforeRef.current = null;
      }
    }

    return () => {
      controller.dispose();
    };
  }, [isOpen, controller, client, activeProject]);

  if (!isOpen) return null;

  const choices = state.projectChoices ? state.suggestions : state.results;

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Tab") {
      const controls = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([hidden]):not([tabindex="-1"]), input',
        ) ?? [],
      );
      if (controls.length > 0) {
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      controller.escape();
      if (!controller.state.open) onClose();
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      controller.move(event.key === "ArrowDown" ? 1 : -1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      choose();
      return;
    }

    if (event.key === "Backspace") {
      const input = inputRef.current;
      if (
        input &&
        controller.backspace(
          input.selectionStart ?? 0,
          input.selectionEnd ?? 0,
          event.nativeEvent.isComposing,
        )
      ) {
        event.preventDefault();
      }
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    controller.setQuery(
      event.target.value,
      event.target.selectionStart ?? event.target.value.length,
    );
  };

  const scope = state.scope;
  const activeProjectName =
    scope.type === "project"
      ? (projects.find((p) => p.id === scope.projectId)?.name ??
        (activeProject?.id === scope.projectId
          ? activeProject.name
          : "Current project"))
      : undefined;

  return (
    <div
      className="search-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="search-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Search documentation"
        onKeyDown={handleKeyDown}
      >
        <div className="search-dialog-header">
          <Icon name="search" className="search-dialog-icon icon-sm" />

          {state.scope.type === "project" && (
            <div className="search-chip">
              <span>{activeProjectName}</span>
              <IconButton
                icon="chevronDown"
                label={`Remove ${activeProjectName} scope`}
                size="sm"
                variant="ghost"
                className="search-chip-close"
                onClick={() => {
                  controller.removeScope();
                  inputRef.current?.focus();
                }}
              />
            </div>
          )}

          <TextInput
            ref={inputRef}
            autoFocus
            id="search-query"
            label="Search documentation"
            type="text"
            className="search-input"
            value={state.query}
            onChange={handleInputChange}
            placeholder={
              state.scope.type === "global"
                ? "Search all registered projects; @ selects a project"
                : "Search this project"
            }
            maxLength={256}
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-controls="search-results"
            aria-expanded={choices.length > 0}
            aria-activedescendant={
              choices.length > 0
                ? `search-option-${state.highlighted}`
                : undefined
            }
          />

          <IconButton
            icon="chevronRight"
            label="Close search"
            size="sm"
            variant="ghost"
            onClick={onClose}
          />
        </div>

        {state.message && (
          <p className="search-status" role="status" aria-live="polite">
            {state.message}
          </p>
        )}

        {choices.length > 0 && (
          <ul
            id="search-results"
            className="search-results"
            role="listbox"
            aria-label={
              state.projectChoices
                ? "Registered projects"
                : "Documentation results"
            }
          >
            {choices.map((choice, index) => {
              const isSelected = index === state.highlighted;

              if (state.projectChoices) {
                const proj = choice as SearchProject;
                return (
                  <li
                    key={proj.id}
                    id={`search-option-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    className={`search-result-item ${
                      isSelected ? "is-selected" : ""
                    }`}
                  >
                    <Button
                      variant="ghost"
                      className="search-result-action"
                      tabIndex={-1}
                      onClick={() => {
                        controller.move(index - state.highlighted);
                        choose();
                      }}
                    >
                      <Icon name="folder" className="icon-sm" />
                      <div className="search-result-info">
                        <strong className="search-result-title">
                          {proj.name}
                        </strong>
                        <span className="search-result-path">{proj.id}</span>
                      </div>
                    </Button>
                  </li>
                );
              }

              const res = choice as SearchResult;
              return (
                <li
                  key={`${res.projectId}:${res.documentId}:${res.heading}:${index}`}
                  id={`search-option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  className={`search-result-item ${
                    isSelected ? "is-selected" : ""
                  }`}
                >
                  <Button
                    variant="ghost"
                    className="search-result-action"
                    tabIndex={-1}
                    onClick={() => {
                      controller.move(index - state.highlighted);
                      choose();
                    }}
                  >
                    <Icon name="file" className="icon-sm" />
                    <div className="search-result-info">
                      <strong className="search-result-title">
                        {res.documentTitle}
                        {res.heading && ` · ${res.heading}`}
                      </strong>
                      <span className="search-result-path">
                        {res.projectName} · {res.sourcePath}
                      </span>
                      {res.snippet && (
                        <span className="search-result-snippet">
                          {res.snippet}
                        </span>
                      )}
                    </div>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        {state.coverage.some((c) => c.status !== "ready") && (
          <div className="search-coverage-container">
            <ul className="search-coverage" aria-label="Index coverage">
              {state.coverage
                .filter((c) => c.status !== "ready")
                .map((cov) => (
                  <li key={cov.id}>
                    {cov.name}: {cov.status} ({cov.indexed}/{cov.total})
                    {cov.message ? ` — ${cov.message}` : ""}
                  </li>
                ))}
            </ul>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => controller.refresh()}
            >
              <Icon name="refresh" className="icon-sm" />
              <span>Refresh search</span>
            </Button>
          </div>
        )}

        <footer className="search-help">
          <span>
            {state.projectChoices
              ? "↑↓ Projects · Enter Switch project"
              : state.query.trim()
                ? "↑↓ Results · Enter Open"
                : "Enter Return to reader"}{" "}
            · Esc Close · @ Selects project · Backspace removes project
          </span>
        </footer>
      </section>
    </div>
  );
}
