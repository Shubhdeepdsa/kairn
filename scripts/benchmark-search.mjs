import { mkdtemp, mkdir, writeFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { ProjectLibrary } from "../dist/core/library.js";
import { SearchService } from "../dist/core/search-service.js";
import { SearchIndex } from "../dist/core/search-index.js";
import { querySearchIndex } from "../dist/core/search-query.js";
const root = await mkdtemp(join(tmpdir(), "kairn-benchmark-"));
try {
  for (const [name, counts] of [
    ["small", [30]],
    ["medium", [300]],
    ["multiple", [100, 100, 100]],
  ]) {
    const data = join(root, name, "data");
    const library = new ProjectLibrary(data);
    const projects = [];
    let bytes = 0;
    for (let p = 0; p < counts.length; p++) {
      const directory = join(root, name, "project-" + p);
      await mkdir(join(directory, "docs"), { recursive: true });
      for (let i = 0; i < counts[p]; i++) {
        const markdown = `# Architecture ${i}\n\n## Configuration\n\nThe configuration resolver handles authentication and local sources.\n\n${"A realistic documentation paragraph covers settings, read-only services and configuration. ".repeat(15)}\n\n\`\`\`typescript\ninterface Request { route: "GET /api/tree" }\nconst service = createDocumentService("docs/architecture.md"); // node:sqlite --no-open\n\`\`\`\n`;
        bytes += Buffer.byteLength(markdown);
        await writeFile(join(directory, "docs", `document-${i}.md`), markdown);
      }
      projects.push(await library.register(directory, "Overlapping project"));
    }
    const service = new SearchService({ dataDirectory: data });
    const request = {
      query: "configuration resolver",
      scope: { type: "global" },
      limit: 20,
    };
    let response;
    let jobs = 0;
    let ticks = 0;
    const pulse = setInterval(() => ticks++, 1);
    const started = performance.now();
    try {
      do {
        response = await service.search(request);
        jobs++;
      } while (
        response.coverage.some((p) => p.status !== "ready") &&
        jobs < 20
      );
    } finally {
      clearInterval(pulse);
      await service.close();
    }
    const indexMs = performance.now() - started;
    const index = await SearchIndex.open(join(data, "search"));
    const times = [];
    try {
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        querySearchIndex(index, request, projects);
        times.push(performance.now() - start);
      }
    } finally {
      index.close();
    }
    times.sort((a, b) => a - b);
    console.log(
      JSON.stringify({
        dataset: name,
        projects: counts.length,
        documents: counts.reduce((a, b) => a + b, 0),
        sourceBytes: bytes,
        indexAndReconcileMs: +indexMs.toFixed(2),
        boundedJobs: jobs,
        coverage: response.coverage.map((p) => ({
          status: p.status,
          indexed: p.indexed,
          total: p.total,
        })),
        readerThreadTimerTicks: ticks,
        querySamples: 100,
        queryMedianMs: +times[50].toFixed(3),
        queryP95Ms: +times[94].toFixed(3),
        databaseBytes: (await stat(join(data, "search", "search.sqlite"))).size,
      }),
    );
  }
} finally {
  await rm(root, { recursive: true, force: true });
}
