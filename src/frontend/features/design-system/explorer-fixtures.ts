import type { SearchProject } from "../../../core/search-contracts.js";
import type { DocumentHeading, DocumentResponse } from "../../lib/api/types.js";

export type { DocumentHeading, DocumentResponse };

export interface FixtureTreeNode {
  readonly id: string;
  readonly title: string;
  readonly path: string;
  readonly kind: "file" | "directory";
  readonly children?: readonly FixtureTreeNode[];
  readonly source?: string;
}

export const marketingBackendProject: SearchProject = {
  id: "marketing-backend",
  name: "Marketing Backend",
};

export const marketingBackendTree: readonly FixtureTreeNode[] = [
  {
    id: "marketing-backend:overview",
    title: "Overview",
    path: "overview.md",
    kind: "file",
  },
  {
    id: "marketing-backend:dir:architecture",
    title: "Architecture",
    path: "docs/architecture",
    kind: "directory",
    children: [
      {
        id: "marketing-backend:system-overview",
        title: "System Overview",
        path: "docs/architecture/system-overview.md",
        kind: "file",
      },
      {
        id: "marketing-backend:database-design",
        title: "Database Design",
        path: "docs/architecture/database.md",
        kind: "file",
      },
      {
        id: "marketing-backend:authentication",
        title: "Authentication & JWT",
        path: "docs/architecture/authentication.md",
        kind: "file",
      },
    ],
  },
  {
    id: "marketing-backend:dir:api",
    title: "API Reference",
    path: "docs/api",
    kind: "directory",
    children: [
      {
        id: "marketing-backend:endpoints",
        title: "Endpoints",
        path: "docs/api/endpoints.md",
        kind: "file",
      },
      {
        id: "marketing-backend:errors",
        title: "Error Codes",
        path: "docs/api/errors.md",
        kind: "file",
      },
    ],
  },
  {
    id: "marketing-backend:dir:deployment",
    title: "Deployment",
    path: "docs/deployment",
    kind: "directory",
    children: [
      {
        id: "marketing-backend:k8s",
        title: "Kubernetes Specs",
        path: "docs/deployment/k8s.md",
        kind: "file",
      },
    ],
  },
  {
    id: "marketing-backend:readme",
    title: "Project README",
    path: "README.md",
    kind: "file",
    source: "Additional Sources",
  },
  {
    id: "marketing-backend:notes",
    title: "Engineering Notes",
    path: "decisions.md",
    kind: "file",
    source: "Additional Sources",
  },
];

export const systemOverviewHeadings: readonly DocumentHeading[] = [
  {
    level: 2,
    title: "Architecture Topology",
    fragment: "architecture-topology",
  },
  { level: 2, title: "Core Components", fragment: "core-components" },
  { level: 3, title: "Event Dispatcher", fragment: "event-dispatcher-code" },
  {
    level: 2,
    title: "Related Documentation",
    fragment: "related-documentation",
  },
];

export const systemOverviewDocument: DocumentResponse = {
  id: "marketing-backend:system-overview",
  path: "docs/architecture/system-overview.md",
  title: "System Overview",
  revision: "rev-marketing-sys-01",
  headings: systemOverviewHeadings,
  diagnostics: [],
  markdown: `# System Overview

The **Marketing Backend** orchestrates multi-channel audience targeting, behavioral segmentation, and dynamic campaign payload dispatching. It is constructed as an event-driven cluster utilizing asynchronous message ingestion, deterministic idempotency filters, and distributed Redis key-space notifications to ensure sub-50ms message processing at continuous peak loads exceeding 40,000 requests per second.

## Architecture Topology

The topological flow decouples edge ingress validation from asynchronous workload processing, maintaining strict single-direction pipelines through the persistence matrix.

## Core Components

The infrastructure is partitioned into modular runtime daemons that execute independently across the Kubernetes cluster topology.

### Event Dispatcher

Partition-keyed campaign egress envelope with cryptographic tracing headers and idempotency controls.

## Related Documentation

Refer to [Database Design](./database.md) for partition schema definitions, and review [Authentication & JWT](./authentication.md) for session revocation protocols.
`,
  html: `<p class="lead">The <strong>Marketing Backend</strong> orchestrates multi-channel audience targeting, behavioral segmentation, and dynamic campaign payload dispatching. It is constructed as an event-driven cluster utilizing asynchronous message ingestion, deterministic idempotency filters, and distributed Redis key-space notifications to ensure sub-50ms message processing at continuous peak loads exceeding 40,000 requests per second.</p>
<div class="kairn-callout" role="note">
  <div class="kairn-callout-header">Architectural Directive: Distributed Tracing &amp; Tenant Isolation</div>
  <p>Every ingress request must propagate standard OpenTelemetry context headers (<code>traceparent</code>, <code>x-tenant-partition-id</code>). Requests lacking a verifiable cryptographically signed tenant token will terminate at the Envoy perimeter prior to internal queue publication.</p>
</div>
<h2 id="architecture-topology">Architecture Topology</h2>
<p>The topological flow decouples edge ingress validation from asynchronous workload processing, maintaining strict single-direction pipelines through the persistence matrix.</p>
<h2 id="core-components">Core Components</h2>
<p>The infrastructure is partitioned into modular runtime daemons that execute independently across the Kubernetes cluster topology.</p>
<div class="table-container">
  <table>
    <thead>
      <tr><th>Subsystem</th><th>Language Runtime</th><th>SLA Threshold</th><th>Scale Model</th></tr>
    </thead>
    <tbody>
      <tr><td>Envoy Proxy</td><td>C++ / Envoy 1.28</td><td>p99 &lt; 3.0ms</td><td>HPA · CPU &gt; 70%</td></tr>
      <tr><td>Campaign Core</td><td>Go 1.22.3</td><td>p99 &lt; 14ms</td><td>Stateless (12x)</td></tr>
      <tr><td>Audience Evaluator</td><td>Rust 1.78 (Tokio)</td><td>p99 &lt; 8.5ms</td><td>Queue Workers</td></tr>
      <tr><td>Event Dispatcher</td><td>Node.js 20 LTS</td><td>p99 &lt; 35ms</td><td>KEDA Consumers</td></tr>
    </tbody>
  </table>
</div>
<h3 id="event-dispatcher-code">Event Dispatcher</h3>
<pre><code class="language-typescript">export interface CampaignDispatchEvent&lt;T = Record&lt;string, unknown&gt;&gt; {
  tenantId: string;
  campaignId: string;
  audienceSegmentId: string;
  payload: T;
  idempotencyKey: string;
  timestamp: number;
}</code></pre>
<h2 id="related-documentation">Related Documentation</h2>
<p>Refer to <a href="#database">Database Design</a> for partition schema definitions, and review <a href="#authentication">Authentication &amp; JWT</a> for session revocation protocol.</p>`,
};

export const systemOverviewPager = {
  previous: {
    title: "Overview",
    id: "marketing-backend:overview",
  },
  next: {
    title: "Database Design",
    id: "marketing-backend:database-design",
  },
};
