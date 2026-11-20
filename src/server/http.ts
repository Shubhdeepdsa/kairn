import { searchRoute, projectRoute } from "./search-routes.js";
import type { SearchApplication } from "./search-routes.js";
import { analyzeMarkdown } from "../core/markdown.js";
import { diagnoseDocumentLinks } from "../core/link-diagnostics.js";
import type { DocumentResponse } from "./contracts.js";
import { resolveDocumentLink } from "../core/document-links.js";
import { documentRevision } from "../core/freshness.js";
import { createServer } from "node:http";
import type { ServerResponse } from "node:http";
import { DocumentError } from "../core/documents.js";
import type { DocumentService } from "../core/documents.js";

/** Static viewer boundary, supplied at composition time; no filesystem routing. */
export interface ViewerPresentation {
  readonly page: string;
  readonly script: string;
  readonly style: string;
  readonly navigationScript?: string;
  readonly searchScripts?: Readonly<Record<string, string>>;
  renderMarkdown(markdown: string): string;
}

/** IPv4 loopback only. Port 0 requests an ephemeral port for tests. */
export interface ServerOptions {
  readonly port?: number;
  readonly application?: SearchApplication;
  readonly viewer?: ViewerPresentation;
}

/** A listening instance; close is idempotent and bounds shutdown to one second. */
export interface RunningServer {
  readonly url: string;
  close(): Promise<void>;
}

const csp =
  "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
function json(response: ServerResponse, status: number, data: unknown): void {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(data));
}
function failure(
  response: ServerResponse,
  status: number,
  code: string,
  message: string,
): void {
  json(response, status, { error: { code, message } });
}

/**
 * Serve a read-only document contract, without accepting filesystem paths.
 * Enforces exact Host/Origin, same-origin browser metadata, GET-only requests,
 * body/header/URL limits, and a restrictive content security policy. No CORS.
 * @param documents - Discovered service; tree requests refresh when supported, and reads use the updated ID map.
 * @param options - Port and optional static viewer presentation.
 * @returns URL and idempotent graceful close operation.
 * @throws For invalid ports or listen failures, including actionable port conflicts.
 */
export async function startDocumentationServer(
  documents: Pick<DocumentService, "tree" | "read"> &
    Partial<
      Pick<
        DocumentService,
        "refresh" | "warning" | "linkTargets" | "classifyLinkTarget"
      >
    >,
  options: ServerOptions = {},
): Promise<RunningServer> {
  const port = options.port ?? 4173;
  if (!Number.isInteger(port) || port < 0 || port > 65535)
    throw new Error("Port must be an integer from 0 to 65535.");
  let origin = "";
  let active = 0;
  const server = createServer(
    {
      maxHeaderSize: 8192,
      headersTimeout: 5000,
      requestTimeout: 5000,
      keepAliveTimeout: 1000,
    },
    (request, response) => {
      response.setHeader("Content-Security-Policy", csp);
      response.setHeader("X-Content-Type-Options", "nosniff");
      response.setHeader("Referrer-Policy", "no-referrer");
      response.setHeader("Cache-Control", "no-store");
      response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
      response.setHeader("X-Frame-Options", "DENY");
      response.setHeader("Connection", "close");
      const target = request.url ?? "";
      if (target.length > 2048) {
        failure(response, 414, "REQUEST_TOO_LARGE", "Request URL is too long.");
        return;
      }
      if (
        request.headers.host !== origin.slice(7) ||
        (request.headers.origin !== undefined &&
          request.headers.origin !== origin) ||
        (request.headers["sec-fetch-site"] !== undefined &&
          !["same-origin", "none"].includes(
            String(request.headers["sec-fetch-site"]),
          ))
      ) {
        failure(
          response,
          403,
          "UNTRUSTED_REQUEST",
          "Only same-origin localhost requests are allowed.",
        );
        return;
      }
      if (request.method !== "GET") {
        response.setHeader("Allow", "GET");
        failure(
          response,
          405,
          "METHOD_NOT_ALLOWED",
          "Only GET requests are supported.",
        );
        return;
      }
      if (
        request.headers["transfer-encoding"] !== undefined ||
        (request.headers["content-length"] !== undefined &&
          request.headers["content-length"] !== "0")
      ) {
        failure(
          response,
          413,
          "REQUEST_BODY_NOT_ALLOWED",
          "Request bodies are not accepted.",
        );
        return;
      }
      if (
        (!/^\/[A-Za-z0-9/._-]*$/.test(target) &&
          !/^\/api\/links\/[a-f0-9]{64}\/[^/]+$/.test(target) &&
          !(
            options.application &&
            (/^\/api\/search(?:\?[^#]*)?$/.test(target) ||
              /^\/api\/projects\/[A-Za-z0-9-]+\/links\/[a-f0-9]{64}\/[^/]+$/.test(
                target,
              ))
          )) ||
        target.split("/").includes("..") ||
        target.split("/").includes(".")
      ) {
        failure(
          response,
          400,
          "INVALID_PATH",
          "Use an exact API route and document identifier.",
        );
        return;
      }
      if (active >= 16) {
        failure(
          response,
          503,
          "BUSY",
          "Too many concurrent requests. Try again.",
        );
        return;
      }
      active++;
      void (async () => {
        try {
          if (
            options.application &&
            (target === "/api/context" ||
              target === "/api/projects" ||
              /^\/api\/search(?:\?|$)/.test(target))
          ) {
            json(response, 200, await searchRoute(target, options.application));
            return;
          }
          const scoped =
            options.application && target.startsWith("/api/projects/")
              ? await projectRoute(target, options.application)
              : { target, documents };
          const route = scoped.target;
          const reader = scoped.documents;
          if (route === "/api/health") json(response, 200, { status: "ok" });
          else if (route === "/api/tree")
            json(response, 200, {
              tree: reader.refresh ? await reader.refresh() : reader.tree,
              ...(reader.warning ? { warning: reader.warning } : {}),
            });
          else if (route.startsWith("/api/links/")) {
            const match = /^\/api\/links\/([a-f0-9]{64})\/([^/]+)$/.exec(route);
            if (!match) {
              failure(
                response,
                400,
                "INVALID_PATH",
                "Invalid link resolution route.",
              );
              return;
            }
            let href: string;
            try {
              href = decodeURIComponent(match[2]!);
            } catch {
              failure(
                response,
                400,
                "INVALID_PATH",
                "Malformed target encoding.",
              );
              return;
            }
            json(
              response,
              200,
              await resolveDocumentLink(
                reader as DocumentService,
                match[1]!,
                href,
              ),
            );
          } else if (route.startsWith("/api/documents/")) {
            const id = route.slice("/api/documents/".length);
            const content = await reader.read(id);
            const { path, title, markdown } = content;
            const revision = documentRevision(
              markdown + "\0" + JSON.stringify(reader.tree),
            );
            const etag = `"${revision}"`;
            response.setHeader("ETag", etag);
            if (request.headers["if-none-match"] === etag) {
              response.writeHead(304);
              response.end();
              return;
            }
            const analysis = analyzeMarkdown(markdown);
            const diagnostics = reader.linkTargets
              ? await diagnoseDocumentLinks(
                  reader as DocumentService,
                  id,
                  markdown,
                )
              : [];
            const body: DocumentResponse = {
              headings: analysis.headings,
              diagnostics,
              id: content.id,
              path,
              title,
              markdown,
              revision,
              ...(options.viewer
                ? { html: options.viewer.renderMarkdown(markdown) }
                : {}),
            };
            json(response, 200, body);
          } else if (
            options.viewer?.searchScripts &&
            Object.hasOwn(options.viewer.searchScripts, route)
          ) {
            response.writeHead(200, {
              "Content-Type": "text/javascript; charset=utf-8",
            });
            response.end(options.viewer.searchScripts[route]);
          } else if (
            options.viewer &&
            [
              "/",
              "/viewer.js",
              "/viewer.css",
              ...(options.viewer.navigationScript ? ["/navigation.js"] : []),
            ].includes(route)
          ) {
            const [body, contentType] =
              route === "/"
                ? [options.viewer.page, "text/html"]
                : route === "/navigation.js"
                  ? [options.viewer.navigationScript!, "text/javascript"]
                  : route === "/viewer.js"
                    ? [options.viewer.script, "text/javascript"]
                    : [options.viewer.style, "text/css"];
            response.writeHead(200, {
              "Content-Type": `${contentType}; charset=utf-8`,
            });
            response.end(body);
          } else failure(response, 404, "NOT_FOUND", "Route was not found.");
        } catch (error) {
          if (error instanceof DocumentError) {
            const status = {
              INVALID_PATH: 400,
              NOT_FOUND: 404,
              ACCESS_DENIED: 403,
              LIMIT_EXCEEDED: 413,
              CHANGED: 409,
            }[error.code];
            failure(response, status, error.code, error.message);
          } else
            failure(
              response,
              500,
              "INTERNAL_ERROR",
              "Document could not be read.",
            );
        } finally {
          active--;
        }
      })();
    },
  );
  server.maxRequestsPerSocket = 100;
  server.setTimeout(5000, (socket) => socket.destroy());
  server.on("checkContinue", (_request, response) =>
    failure(
      response,
      413,
      "REQUEST_BODY_NOT_ALLOWED",
      "Request bodies are not accepted.",
    ),
  );
  server.on("clientError", (_error, socket) => {
    if (socket.writable)
      socket.end(
        'HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Type: application/json\r\n\r\n{"error":{"code":"INVALID_REQUEST","message":"Invalid or oversized HTTP request."}}',
      );
  });
  await new Promise<void>((resolve, reject) => {
    const failed = (error: NodeJS.ErrnoException): void => {
      reject(
        error.code === "EADDRINUSE"
          ? new Error(`Port ${port} is already in use. Choose another --port.`)
          : error,
      );
    };
    server.once("error", failed);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", failed);
      resolve();
    });
  });
  const address = server.address();
  if (address === null || typeof address === "string")
    throw new Error("Could not determine server address.");
  origin = `http://127.0.0.1:${address.port}`;
  let closing: Promise<void> | undefined;
  return {
    url: origin,
    close() {
      closing ??= new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => server.closeAllConnections(), 1000);
        timeout.unref();
        server.close((error) => {
          clearTimeout(timeout);
          if (error) reject(error);
          else resolve();
        });
        server.closeIdleConnections();
      });
      return closing;
    },
  };
}
