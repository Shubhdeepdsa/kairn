// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { DocCallout } from "../../src/frontend/components/ui/DocCallout";
import { DocPager } from "../../src/frontend/features/explorer/DocPager";
import { DocOutline } from "../../src/frontend/features/explorer/DocOutline";
import { DocTree } from "../../src/frontend/features/explorer/DocTree";
import { DocReader } from "../../src/frontend/features/explorer/DocReader";
import { ExplorerShell } from "../../src/frontend/features/explorer/ExplorerShell";
import {
  marketingBackendTree,
  systemOverviewDocument,
  systemOverviewHeadings,
} from "../../src/frontend/features/design-system/explorer-fixtures";

afterEach(cleanup);

describe("DocCallout component", () => {
  it("renders directive callout with title and children", () => {
    render(
      <DocCallout title="Architectural Directive: Tracing">
        <p>Telemetry headers required.</p>
      </DocCallout>,
    );
    expect(screen.getByText("Architectural Directive: Tracing")).not.toBeNull();
    expect(screen.getByText("Telemetry headers required.")).not.toBeNull();
    expect(screen.getByRole("note")).not.toBeNull();
  });
});

describe("DocPager component", () => {
  it("renders previous and next document links and responds to clicks", () => {
    const handleSelect = vi.fn();
    render(
      <DocPager
        previous={{ title: "Overview", id: "doc-overview" }}
        next={{ title: "Database Design", id: "doc-db" }}
        onSelect={handleSelect}
      />,
    );

    expect(screen.getByText("Overview")).not.toBeNull();
    expect(screen.getByText("Database Design")).not.toBeNull();

    fireEvent.click(screen.getByText("Overview"));
    expect(handleSelect).toHaveBeenCalledWith("doc-overview");

    fireEvent.click(screen.getByText("Database Design"));
    expect(handleSelect).toHaveBeenCalledWith("doc-db");
  });

  it("returns null when neither previous nor next is provided", () => {
    const { container } = render(<DocPager />);
    expect(container.firstChild).toBeNull();
  });
});

describe("DocOutline component", () => {
  it("renders table of contents list with active waypoint dot", () => {
    const handleSelectHeading = vi.fn();
    render(
      <DocOutline
        headings={systemOverviewHeadings}
        activeFragment="architecture-topology"
        onSelectHeading={handleSelectHeading}
      />,
    );

    expect(screen.getByText("On this page")).not.toBeNull();
    expect(screen.getByText("Architecture Topology")).not.toBeNull();
    expect(screen.getByText("Core Components")).not.toBeNull();

    const activeDot = document.querySelector('[data-active="true"]');
    expect(activeDot).not.toBeNull();

    fireEvent.click(screen.getByText("Core Components"));
    expect(handleSelectHeading).toHaveBeenCalledWith("core-components");
  });

  it("collapses outline on toggle click", () => {
    render(<DocOutline headings={systemOverviewHeadings} />);
    const toggle = screen.getByRole("button", { name: /collapse outline/i });
    fireEvent.click(toggle);
    expect(screen.queryByText("Architecture Topology")).toBeNull();
  });
});

describe("DocTree component", () => {
  it("renders hierarchy and toggles directory expansion", () => {
    const handleSelect = vi.fn();
    render(
      <DocTree
        nodes={marketingBackendTree}
        activeDocumentId="marketing-backend:system-overview"
        onSelectDocument={handleSelect}
      />,
    );

    expect(screen.getByText("Navigation tree")).not.toBeNull();
    expect(screen.getByText("System Overview")).not.toBeNull();
    expect(screen.getByText("Additional sources")).not.toBeNull();

    // Active document has active bar and aria-current="page"
    const activeDoc = screen.getByText("System Overview").closest("button");
    expect(activeDoc?.getAttribute("aria-current")).toBe("page");

    // Click another document
    fireEvent.click(screen.getByText("Database Design"));
    expect(handleSelect).toHaveBeenCalledWith(
      "marketing-backend:database-design",
    );

    // Toggle a directory
    const archFolder = screen.getByText("Architecture").closest("button");
    expect(archFolder?.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(archFolder!);
    expect(archFolder?.getAttribute("aria-expanded")).toBe("false");
  });
});

describe("DocReader component", () => {
  it("renders document breadcrumbs, title, metadata and content", () => {
    const handleCopy = vi.fn();
    render(
      <DocReader
        document={systemOverviewDocument}
        projectName="marketing-backend"
        onCopyPath={handleCopy}
      />,
    );

    expect(screen.getByRole("article")).not.toBeNull();
    expect(screen.getByText("System Overview")).not.toBeNull();
    expect(screen.getByText("marketing-backend")).not.toBeNull();
    expect(screen.getByText("system-overview.md")).not.toBeNull();

    const copyBtn = screen.getByTitle("Copy path");
    fireEvent.click(copyBtn);
    expect(handleCopy).toHaveBeenCalled();
  });
});

describe("ExplorerShell component", () => {
  it("renders 3 regions and supports mobile drawer disclosure", () => {
    render(
      <ExplorerShell
        projectName="Marketing Backend"
        navigation={<div>Nav tree content</div>}
        outline={<div>TOC outline content</div>}
      >
        <div>Reader article content</div>
      </ExplorerShell>,
    );

    expect(screen.getAllByText("Marketing Backend").length).toBeGreaterThan(0);
    expect(screen.getByText("Nav tree content")).not.toBeNull();
    expect(screen.getByText("Reader article content")).not.toBeNull();
    expect(screen.getByText("TOC outline content")).not.toBeNull();

    const toggle = screen.getByRole("button", {
      name: /open navigation/i,
    });
    fireEvent.click(toggle);
    expect(
      screen.getByRole("button", { name: /close navigation/i }),
    ).not.toBeNull();
  });
});
