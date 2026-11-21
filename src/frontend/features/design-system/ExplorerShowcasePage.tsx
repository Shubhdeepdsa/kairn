import { useState } from "react";
import { Link } from "react-router";
import { useTheme } from "../../app/providers/ThemeProvider";
import type {
  Appearance,
  AccentPalette,
} from "../../app/providers/ThemeProvider";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Presentation";
import { ExplorerShell } from "../explorer/ExplorerShell";
import { DocTree } from "../explorer/DocTree";
import { DocReader } from "../explorer/DocReader";
import { DocOutline } from "../explorer/DocOutline";
import {
  marketingBackendProject,
  marketingBackendTree,
  systemOverviewDocument,
  systemOverviewPager,
} from "./explorer-fixtures";
import type { DocumentResponse } from "./explorer-fixtures";

/**
 * Dedicated visual integration showcase for the Phase 6C Documentation Explorer shell.
 * Uses explicitly labeled fixture-only data from the canonical Stitch Marketing Backend reference.
 */
export function ExplorerShowcasePage() {
  const theme = useTheme();
  const [activeDocId, setActiveDocId] = useState<string>(
    "marketing-backend:system-overview",
  );
  const [activeFragment, setActiveFragment] = useState<string>(
    "architecture-topology",
  );

  // Simple fixture document switch
  const activeDocument: DocumentResponse =
    activeDocId === "marketing-backend:overview"
      ? {
          id: "marketing-backend:overview",
          title: "System Overview & Getting Started",
          path: "overview.md",
          revision: "rev-overview-01",
          headings: [
            { level: 2, title: "Overview", fragment: "overview" },
            { level: 2, title: "Prerequisites", fragment: "prerequisites" },
          ],
          diagnostics: [],
          markdown:
            "# Overview\n\nWelcome to the Marketing Backend documentation.",
          html: `<p class="lead">Welcome to the <strong>Marketing Backend</strong> documentation overview.</p>
<h2 id="overview">Overview</h2>
<p>This service manages customer behavioral event streaming and campaign dispatching.</p>
<h2 id="prerequisites">Prerequisites</h2>
<p>Ensure you have access to the local Kubernetes development cluster.</p>`,
        }
      : activeDocId === "marketing-backend:database-design"
        ? {
            id: "marketing-backend:database-design",
            title: "Database Design & Partitioning",
            path: "docs/architecture/database.md",
            revision: "rev-database-01",
            headings: [
              {
                level: 2,
                title: "Schema Architecture",
                fragment: "schema-arch",
              },
              {
                level: 2,
                title: "Partition Strategy",
                fragment: "partitioning",
              },
            ],
            diagnostics: [],
            markdown:
              "# Database Design\n\nHigh-throughput schema partitioning.",
            html: `<p class="lead">Database partitioning and persistence schema for high-throughput campaign data.</p>
<h2 id="schema-arch">Schema Architecture</h2>
<p>PostgreSQL 16 with streaming replication and logical partition tables.</p>
<h2 id="partitioning">Partition Strategy</h2>
<p>Range partitioning by tenant and month to maintain sub-10ms query responses.</p>`,
          }
        : systemOverviewDocument;

  const currentHeadings = activeDocument.headings;

  return (
    <div className="explorer-showcase-container">
      {/* Visual specimen header */}
      <div className="explorer-showcase-bar">
        <div className="explorer-showcase-bar-left">
          <Link to="/design-system" className="explorer-showcase-back">
            ← Design system
          </Link>
          <span className="type-technical">
            Phase 6C-1 Visual Foundation Specimen
          </span>
          <Badge>Runtime Preview · Fixture Data Only</Badge>
        </div>
        <div className="explorer-showcase-bar-right">
          <div className="explorer-showcase-control">
            <Select
              label="Theme"
              value={theme.appearance}
              onChange={(e) =>
                theme.setAppearance(e.target.value as Appearance)
              }
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </Select>
          </div>
          <div className="explorer-showcase-control">
            <Select
              label="Accent"
              value={theme.accent}
              onChange={(e) => theme.setAccent(e.target.value as AccentPalette)}
            >
              <option value="mineral">Mineral Yellow</option>
              <option value="blue">Instrument Blue</option>
              <option value="forest">Forest</option>
            </Select>
          </div>
        </div>
      </div>

      {/* 3-Region Explorer Shell */}
      <ExplorerShell
        projectName={marketingBackendProject.name}
        navigation={
          <DocTree
            nodes={marketingBackendTree}
            activeDocumentId={activeDocId}
            onSelectDocument={(id) => {
              setActiveDocId(id);
              setActiveFragment("");
            }}
          />
        }
        outline={
          <DocOutline
            headings={currentHeadings}
            activeFragment={activeFragment}
            onSelectHeading={(fragment) => setActiveFragment(fragment)}
          />
        }
      >
        <DocReader
          document={activeDocument}
          projectName={marketingBackendProject.name}
          previousDoc={systemOverviewPager.previous}
          nextDoc={systemOverviewPager.next}
          onSelectDoc={(id) => setActiveDocId(id)}
        />
      </ExplorerShell>
    </div>
  );
}
