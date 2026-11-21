// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { SafeHtmlArticle } from "../../src/frontend/features/explorer/SafeHtmlArticle";
import { DocReader } from "../../src/frontend/features/explorer/DocReader";
import { DocOutline } from "../../src/frontend/features/explorer/DocOutline";
import type {
  DocumentResponse,
  DocumentHeading,
  LinkDiagnostic,
} from "../../src/frontend/lib/api/types";

afterEach(cleanup);

const mockDocument: DocumentResponse = {
  id: "a".repeat(64),
  path: "architecture/overview.md",
  title: "Architecture Overview",
  markdown:
    "# Architecture Overview\n\nSee [Database](./database.md) and [Section](#components).\n",
  revision: "rev-1234567890abcdef",
  html: '<h1>Architecture Overview</h1><p>See <a href="./database.md">Database</a> and <a href="#components">Components</a>, or <a href="https://example.com" rel="noopener noreferrer" target="_blank">External</a>.</p><h2 id="components">Components</h2><p>Core components details.</p>',
  headings: [
    {
      level: 1,
      title: "Architecture Overview",
      fragment: "architecture-overview",
    },
    { level: 2, title: "Components", fragment: "components" },
    { level: 3, title: "Sub-component", fragment: "sub-component" },
  ],
  diagnostics: [],
};

describe("SafeHtmlArticle component", () => {
  it("renders server HTML inside .kairn-prose and forwards anchor click events", () => {
    const handleClick = vi.fn();
    render(
      <SafeHtmlArticle
        html="<p>Safe content with <a href='#section'>Anchor</a></p>"
        onAnchorClick={handleClick}
      />,
    );

    const article = document.querySelector(".kairn-prose.doc-reader-content");
    expect(article).not.toBeNull();
    expect(article?.textContent).toContain("Safe content with Anchor");

    const anchor = screen.getByRole("link", { name: "Anchor" });
    fireEvent.click(anchor);
    expect(handleClick).toHaveBeenCalled();
  });
});

describe("DocReader link navigation and diagnostics", () => {
  it("routes internal fragment links to onSelectHeading", () => {
    const handleSelectHeading = vi.fn();
    const handleNavigateLink = vi.fn();

    render(
      <DocReader
        document={mockDocument}
        onSelectHeading={handleSelectHeading}
        onNavigateLink={handleNavigateLink}
      />,
    );

    const fragmentLink = screen.getByRole("link", { name: "Components" });
    fireEvent.click(fragmentLink);

    expect(handleSelectHeading).toHaveBeenCalledWith("components");
    expect(handleNavigateLink).not.toHaveBeenCalled();
  });

  it("routes relative markdown links to onNavigateLink", () => {
    const handleSelectHeading = vi.fn();
    const handleNavigateLink = vi.fn();

    render(
      <DocReader
        document={mockDocument}
        onSelectHeading={handleSelectHeading}
        onNavigateLink={handleNavigateLink}
      />,
    );

    const relativeLink = screen.getByRole("link", { name: "Database" });
    fireEvent.click(relativeLink);

    expect(handleNavigateLink).toHaveBeenCalledWith("./database.md");
    expect(handleSelectHeading).not.toHaveBeenCalled();
  });

  it("allows external links without preventing default or routing to internal navigation", () => {
    const handleSelectHeading = vi.fn();
    const handleNavigateLink = vi.fn();

    render(
      <DocReader
        document={mockDocument}
        onSelectHeading={handleSelectHeading}
        onNavigateLink={handleNavigateLink}
      />,
    );

    const externalLink = screen.getByRole("link", { name: "External" });
    fireEvent.click(externalLink);

    expect(handleNavigateLink).not.toHaveBeenCalled();
    expect(handleSelectHeading).not.toHaveBeenCalled();
  });

  it("renders scan-time diagnostics when present in document", () => {
    const docWithDiagnostics: DocumentResponse = {
      ...mockDocument,
      diagnostics: [
        {
          code: "MISSING",
          message: "Markdown destination is missing. Check its relative path.",
          target: "missing-doc.md",
        },
      ],
    };

    render(<DocReader document={docWithDiagnostics} />);

    expect(screen.getByText("Document Link Diagnostics")).not.toBeNull();
    expect(
      screen.getByText(
        "Markdown destination is missing. Check its relative path.",
      ),
    ).not.toBeNull();
    expect(screen.getByText("(missing-doc.md)")).not.toBeNull();
  });

  it("renders runtime link resolution diagnostic when link target fails", () => {
    const runtimeDiag: LinkDiagnostic = {
      code: "EXCLUDED",
      message: "Destination is excluded by the current documentation rules.",
      target: "internal/secret.md",
    };

    render(
      <DocReader document={mockDocument} activeDiagnostic={runtimeDiag} />,
    );

    expect(screen.getByText("Link Resolution Warning")).not.toBeNull();
    expect(
      screen.getByText(
        "Destination is excluded by the current documentation rules.",
      ),
    ).not.toBeNull();
    expect(screen.getByText("(internal/secret.md)")).not.toBeNull();
  });
});

describe("DocOutline component", () => {
  it("renders meaningful empty state when headings list is empty", () => {
    render(<DocOutline headings={[]} />);
    expect(screen.getByText("On this page")).not.toBeNull();
    expect(screen.getByText("No headings on this page")).not.toBeNull();
  });

  it("supports duplicate headings and Unicode heading fragments", () => {
    const unicodeAndDuplicateHeadings: readonly DocumentHeading[] = [
      { level: 2, title: "Overview", fragment: "overview" },
      { level: 2, title: "Overview", fragment: "overview-1" },
      { level: 2, title: "Überblick (German)", fragment: "überblick-german" },
      { level: 3, title: "日本語 (Japanese)", fragment: "日本語-japanese" },
    ];

    const handleSelectHeading = vi.fn();
    render(
      <DocOutline
        headings={unicodeAndDuplicateHeadings}
        activeFragment="overview-1"
        onSelectHeading={handleSelectHeading}
      />,
    );

    expect(screen.getByText("Überblick (German)")).not.toBeNull();
    expect(screen.getByText("日本語 (Japanese)")).not.toBeNull();

    // Verify correct item is active
    const activeLink = document.querySelector(".doc-outline-link.is-active");
    expect(activeLink?.getAttribute("href")).toBe("#overview-1");

    // Click Unicode heading
    fireEvent.click(screen.getByText("日本語 (Japanese)"));
    expect(handleSelectHeading).toHaveBeenCalledWith("日本語-japanese");
  });

  it("applies level classes for nested heading levels", () => {
    const nestedHeadings: readonly DocumentHeading[] = [
      { level: 2, title: "H2 Item", fragment: "h2-item" },
      { level: 3, title: "H3 Item", fragment: "h3-item" },
      { level: 4, title: "H4 Item", fragment: "h4-item" },
    ];

    render(<DocOutline headings={nestedHeadings} />);

    const h3Item = screen.getByText("H3 Item").closest(".doc-outline-item");
    const h4Item = screen.getByText("H4 Item").closest(".doc-outline-item");

    expect(h3Item?.className).toContain("level-3");
    expect(h3Item?.className).toContain("doc-outline-subitem");
    expect(h4Item?.className).toContain("level-4");
  });
});
