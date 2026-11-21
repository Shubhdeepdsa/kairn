import { describe, it, expect } from "vitest";
import {
  marketingBackendProject,
  marketingBackendTree,
  systemOverviewDocument,
  systemOverviewHeadings,
  systemOverviewPager,
} from "../../src/frontend/features/design-system/explorer-fixtures";

describe("explorer fixtures", () => {
  it("provides valid project metadata", () => {
    expect(marketingBackendProject.id).toBe("marketing-backend");
    expect(marketingBackendProject.name).toBe("Marketing Backend");
  });

  it("provides structured hierarchical tree items", () => {
    expect(marketingBackendTree.length).toBeGreaterThan(3);
    const arch = marketingBackendTree.find(
      (node) => node.title === "Architecture",
    );
    expect(arch).toBeDefined();
    expect(arch?.kind).toBe("directory");
    expect(arch?.children?.length).toBe(3);
    expect(arch?.children?.[0]?.title).toBe("System Overview");
  });

  it("provides a valid DocumentResponse fixture with HTML, headings and markdown", () => {
    expect(systemOverviewDocument.id).toBe("marketing-backend:system-overview");
    expect(systemOverviewDocument.title).toBe("System Overview");
    expect(systemOverviewDocument.headings.length).toBe(4);
    expect(systemOverviewDocument.headings).toEqual(systemOverviewHeadings);
    expect(systemOverviewDocument.html).toContain("Architecture Topology");
    expect(systemOverviewDocument.html).toContain("kairn-callout");
    expect(systemOverviewDocument.markdown).toContain("# System Overview");
  });

  it("provides valid sequential document pager navigation", () => {
    expect(systemOverviewPager.previous.title).toBe("Overview");
    expect(systemOverviewPager.next.title).toBe("Database Design");
  });
});
