// @vitest-environment jsdom
import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
} from "@testing-library/react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { SearchPaletteDialog } from "../../src/frontend/features/search/SearchPaletteDialog";
import { SearchTrigger } from "../../src/frontend/features/search/SearchTrigger";
import type { ApiClient } from "../../src/frontend/lib/api/client";
import type {
  SearchProject,
  SearchResponse,
} from "../../src/frontend/lib/api/client";

afterEach(cleanup);

const mockProject: SearchProject = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Marketing Backend",
};

const secondProject: SearchProject = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Platform Core",
};

const mockSearchResponse: SearchResponse = {
  results: [
    {
      projectId: mockProject.id,
      documentId: "a".repeat(64),
      projectName: "Marketing Backend",
      documentTitle: "Architecture Overview",
      sourcePath: "architecture/overview.md",
      heading: "Components",
      snippet: "Core components and event dispatch loop.",
      score: 1.0,
    },
  ],
  coverage: [
    {
      id: mockProject.id,
      name: "Marketing Backend",
      status: "ready",
      indexed: 10,
      total: 10,
    },
  ],
};

function createMockClient(overrides?: Partial<ApiClient>): ApiClient {
  return {
    getContext: async () => mockProject,
    getProjects: async () => [mockProject, secondProject],
    getTree: async () => ({ tree: [] }),
    getDocument: async (id) => ({
      id,
      path: "doc.md",
      title: "Doc",
      markdown: "# Doc",
      revision: "rev-1",
      headings: [],
      diagnostics: [],
    }),
    resolveLink: async () => ({
      kind: "external",
      href: "https://example.com",
    }),
    search: async () => mockSearchResponse,
    ...overrides,
  };
}

describe("SearchTrigger component", () => {
  it("renders trigger button with accessible name and keyboard badge", () => {
    const handleClick = vi.fn();
    render(<SearchTrigger onClick={handleClick} />);

    const button = screen.getByRole("button", {
      name: "Search documentation (Command or Control K)",
    });
    expect(button).not.toBeNull();
    expect(screen.getByText("⌘K")).not.toBeNull();

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalled();
  });
});

describe("SearchPaletteDialog component", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens modal dialog with scoped project chip when activeProject is provided", async () => {
    const handleClose = vi.fn();
    const handleNavigate = vi.fn();
    const client = createMockClient();

    // Mock Context Provider
    const { ApplicationProvider } =
      await import("../../src/frontend/app/providers/ApplicationProvider");

    render(
      <ApplicationProvider client={client}>
        <SearchPaletteDialog
          isOpen={true}
          onClose={handleClose}
          activeProject={mockProject}
          onNavigate={handleNavigate}
        />
      </ApplicationProvider>,
    );

    // Context loading resolution
    await act(async () => {
      await Promise.resolve();
    });

    const dialog = screen.getByRole("dialog", {
      name: "Search documentation",
    });
    expect(dialog).not.toBeNull();

    // Shows scoped project chip
    expect(screen.getByText("Marketing Backend")).not.toBeNull();
  });

  it("removes project scope when project chip close button is clicked", async () => {
    const handleClose = vi.fn();
    const handleNavigate = vi.fn();
    const client = createMockClient();

    const { ApplicationProvider } =
      await import("../../src/frontend/app/providers/ApplicationProvider");

    render(
      <ApplicationProvider client={client}>
        <SearchPaletteDialog
          isOpen={true}
          onClose={handleClose}
          activeProject={mockProject}
          onNavigate={handleNavigate}
        />
      </ApplicationProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    const removeScopeBtn = screen.getByRole("button", {
      name: /Remove Marketing Backend scope/i,
    });
    fireEvent.click(removeScopeBtn);

    // Chip is removed
    expect(document.querySelector(".search-chip")).toBeNull();
  });

  it("executes search query through client and renders results with keyboard selection", async () => {
    const handleClose = vi.fn();
    const handleNavigate = vi.fn();
    const searchSpy = vi.fn(async () => mockSearchResponse);
    const client = createMockClient({ search: searchSpy });

    const { ApplicationProvider } =
      await import("../../src/frontend/app/providers/ApplicationProvider");

    render(
      <ApplicationProvider client={client}>
        <SearchPaletteDialog
          isOpen={true}
          onClose={handleClose}
          activeProject={mockProject}
          onNavigate={handleNavigate}
        />
      </ApplicationProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    const input = screen.getByRole("combobox", {
      name: "Search documentation",
    });

    // Type query
    fireEvent.change(input, { target: { value: "architecture" } });

    // Advance debounce timer (200ms)
    await act(async () => {
      vi.advanceTimersByTime(250);
      await Promise.resolve();
    });

    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "architecture",
        scope: { type: "project", projectId: mockProject.id },
      }),
    );

    // Results rendered
    expect(
      screen.getByText("Architecture Overview · Components"),
    ).not.toBeNull();
    expect(
      screen.getByText("Core components and event dispatch loop."),
    ).not.toBeNull();

    // Select with Enter
    fireEvent.keyDown(input, { key: "Enter" });

    expect(handleNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: mockProject.id,
        documentId: "a".repeat(64),
      }),
    );
    expect(handleClose).toHaveBeenCalled();
  });

  it("closes palette dialog on Escape key", async () => {
    const handleClose = vi.fn();
    const handleNavigate = vi.fn();
    const client = createMockClient();

    const { ApplicationProvider } =
      await import("../../src/frontend/app/providers/ApplicationProvider");

    render(
      <ApplicationProvider client={client}>
        <SearchPaletteDialog
          isOpen={true}
          onClose={handleClose}
          activeProject={mockProject}
          onNavigate={handleNavigate}
        />
      </ApplicationProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(handleClose).toHaveBeenCalled();
  });

  it("displays partial coverage status and offers refresh action", async () => {
    const handleClose = vi.fn();
    const handleNavigate = vi.fn();
    const partialCoverageResponse: SearchResponse = {
      results: [],
      coverage: [
        {
          id: mockProject.id,
          name: "Marketing Backend",
          status: "indexing",
          indexed: 3,
          total: 10,
          message: "Scanning directory",
        },
      ],
    };
    const searchSpy = vi.fn(async () => partialCoverageResponse);
    const client = createMockClient({ search: searchSpy });

    const { ApplicationProvider } =
      await import("../../src/frontend/app/providers/ApplicationProvider");

    render(
      <ApplicationProvider client={client}>
        <SearchPaletteDialog
          isOpen={true}
          onClose={handleClose}
          activeProject={mockProject}
          onNavigate={handleNavigate}
        />
      </ApplicationProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "test" } });

    await act(async () => {
      vi.advanceTimersByTime(250);
      await Promise.resolve();
    });

    expect(
      screen.getByText(/Marketing Backend: indexing \(3\/10\)/),
    ).not.toBeNull();
    const refreshBtn = screen.getByRole("button", { name: "Refresh search" });
    expect(refreshBtn).not.toBeNull();

    fireEvent.click(refreshBtn);
    await act(async () => {
      vi.advanceTimersByTime(250);
      await Promise.resolve();
    });

    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ refresh: true }),
    );
  });
});
