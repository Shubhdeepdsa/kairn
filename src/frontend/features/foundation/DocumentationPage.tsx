import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
import { useWorkspace } from "../../layouts/WorkspaceLayout";
import { useApiClient } from "../../app/providers/ApplicationProvider";
import { ExplorerShell } from "../explorer/ExplorerShell";
import { DocTree } from "../explorer/DocTree";
import { DocReader } from "../explorer/DocReader";
import { DocOutline } from "../explorer/DocOutline";
import {
  findDefaultDocument,
  getPreviousNextDocuments,
  flattenTree,
} from "../explorer/navigation-tree";
import { parseReaderLocation } from "../../../core/reader-location.js";
import type {
  NavigationEntry,
  DocumentResponse,
  LinkDiagnostic,
} from "../../lib/api/types";

type TreeState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | {
      status: "ready";
      tree: readonly NavigationEntry[];
      warning?: string | undefined;
    };

type DocState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; document: DocumentResponse };

export function DocumentationPage() {
  const { documentId } = useParams();
  const location = useLocation();
  const project = useWorkspace();
  const client = useApiClient();
  const navigate = useNavigate();
  const articleRef = useRef<HTMLDivElement>(null);

  const isInvalidDocId = Boolean(
    documentId && !/^[a-f0-9]{64}$/.test(documentId),
  );

  // Folder collapse state, isolated per project
  const [collapsedByProject, setCollapsedByProject] = useState<
    Record<string, ReadonlySet<string>>
  >({});
  const projectCollapsed = collapsedByProject[project.id] ?? new Set<string>();

  const handleToggleCollapse = (path: string) => {
    setCollapsedByProject((prev) => {
      const currentSet = prev[project.id] ?? new Set<string>();
      const nextSet = new Set(currentSet);
      if (nextSet.has(path)) nextSet.delete(path);
      else nextSet.add(path);
      return { ...prev, [project.id]: nextSet };
    });
  };

  const [treeState, setTreeState] = useState<TreeState>({ status: "loading" });
  const [docState, setDocState] = useState<DocState>({ status: "idle" });
  const [activeFragment, setActiveFragment] = useState<string>("");
  const [linkDiagnostic, setLinkDiagnostic] = useState<LinkDiagnostic | null>(
    null,
  );
  const [vanishedStatus, setVanishedStatus] = useState<string | null>(null);

  // Live freshness refs
  const contentRevisionRef = useRef<string | undefined>(undefined);
  const treeSignatureRef = useRef<string>("");
  const refreshingRef = useRef<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentDocIdRef = useRef<string | undefined>(documentId);
  currentDocIdRef.current = documentId;

  // 1. Fetch project tree on project change
  useEffect(() => {
    if (isInvalidDocId) return;
    const controller = new AbortController();
    setTreeState({ status: "loading" });

    client
      .getTree(project.id, controller.signal)
      .then((res) => {
        if (!controller.signal.aborted) {
          treeSignatureRef.current = JSON.stringify(res.tree);
          setTreeState({
            status: "ready",
            tree: res.tree,
            warning: res.warning,
          });
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setTreeState({
            status: "error",
            error: err instanceof Error ? err.message : "Tree unavailable",
          });
        }
      });

    return () => controller.abort();
  }, [client, project.id, isInvalidDocId]);

  // 2. Legacy bookmark check & default document selection
  useEffect(() => {
    if (isInvalidDocId) return;
    if (treeState.status !== "ready") return;

    // Check for legacy reader bookmark in hash (e.g. #id or #p/project/id)
    if (location.hash && !documentId) {
      const bookmark = parseReaderLocation(location.hash);
      if (bookmark && bookmark.id !== "invalid") {
        navigate(
          `/projects/${bookmark.projectId ?? project.id}/docs/${bookmark.id}${
            bookmark.fragment ? `#${encodeURIComponent(bookmark.fragment)}` : ""
          }`,
          { replace: true },
        );
        return;
      }
    }

    // Otherwise auto-select default document if no documentId is in URL
    if (!documentId) {
      const defaultDoc = findDefaultDocument(treeState.tree);
      if (defaultDoc) {
        navigate(`/projects/${project.id}/docs/${defaultDoc.id}`, {
          replace: true,
        });
      }
    }
  }, [
    treeState,
    documentId,
    project.id,
    navigate,
    isInvalidDocId,
    location.hash,
  ]);

  // 3. Fetch active document when documentId changes
  useEffect(() => {
    if (!documentId || isInvalidDocId) {
      setDocState({ status: "idle" });
      contentRevisionRef.current = undefined;
      return;
    }

    const controller = new AbortController();
    setDocState({ status: "loading" });
    setLinkDiagnostic(null);

    client
      .getDocument(documentId, project.id, controller.signal)
      .then((doc) => {
        if (!controller.signal.aborted) {
          if (!("notModified" in doc)) {
            contentRevisionRef.current = doc.revision;
            setDocState({ status: "ready", document: doc });
          }
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setDocState({
            status: "error",
            error: err instanceof Error ? err.message : "Document unavailable",
          });
        }
      });

    return () => controller.abort();
  }, [client, project.id, documentId, isInvalidDocId]);

  // 4. Live freshness loop: bounded polling (~2s) while tab is visible
  const scheduleRefresh = useCallback(() => {
    if (typeof window === "undefined" || typeof document === "undefined")
      return;
    if (document.hidden) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = setTimeout(async () => {
      timerRef.current = null;
      if (refreshingRef.current || document.hidden) return;
      refreshingRef.current = true;

      try {
        // 1. Refresh tree first
        const treeRes = await client.getTree(project.id);
        const nextSignature = JSON.stringify(treeRes.tree);
        const treeChanged = nextSignature !== treeSignatureRef.current;

        if (treeChanged) {
          treeSignatureRef.current = nextSignature;
          setTreeState({
            status: "ready",
            tree: treeRes.tree,
            warning: treeRes.warning,
          });

          // Check if current document vanished
          const activeDocId = currentDocIdRef.current;
          if (activeDocId) {
            const flat = flattenTree(treeRes.tree);
            const exists = flat.some(
              (node) => node.kind === "document" && node.id === activeDocId,
            );

            if (!exists) {
              const fallback = findDefaultDocument(treeRes.tree);
              if (fallback) {
                setVanishedStatus(
                  "The previous document was removed or excluded; showing another available document.",
                );
                navigate(`/projects/${project.id}/docs/${fallback.id}`, {
                  replace: true,
                });
              } else {
                setDocState({ status: "idle" });
                setVanishedStatus(
                  "No Markdown documents found. Add .md files; the sidebar updates automatically.",
                );
              }
              return;
            }
          }
        }

        // 2. Conditionally refresh active document with ETag/304
        const activeDocId = currentDocIdRef.current;
        if (activeDocId && contentRevisionRef.current) {
          const docRes = await client.getDocument(activeDocId, project.id, {
            ifNoneMatch: contentRevisionRef.current,
          });

          if ("notModified" in docRes && docRes.notModified) {
            // 304 Not Modified: leave DOM completely untouched
            return;
          }

          if (!("notModified" in docRes)) {
            contentRevisionRef.current = docRes.revision;
            setDocState({ status: "ready", document: docRes });
          }
        }
      } catch {
        // Silently tolerate transient background refresh failures
      } finally {
        refreshingRef.current = false;
        scheduleRefresh();
      }
    }, 2000);
  }, [client, project.id, navigate]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      } else {
        // Resume promptly upon visibility return
        scheduleRefresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    scheduleRefresh();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [scheduleRefresh]);

  // 5. Heading selection and scrolling
  const handleSelectHeading = useCallback((fragment: string) => {
    setActiveFragment(fragment);
    if (typeof document !== "undefined") {
      const el = document.getElementById(fragment);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        el.setAttribute("tabindex", "-1");
        el.focus({ preventScroll: true });
      }
    }
    if (typeof window !== "undefined") {
      const targetHash = `#${encodeURIComponent(fragment)}`;
      if (window.location.hash !== targetHash) {
        window.history.pushState(null, "", targetHash);
      }
    }
  }, []);

  // 6. Hash change and initial fragment scroll
  useEffect(() => {
    if (docState.status !== "ready") return;

    const hash =
      typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    if (hash) {
      try {
        const decoded = decodeURIComponent(hash);
        setActiveFragment(decoded);
        const el = document.getElementById(decoded);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      } catch {
        // Ignore malformed URL hashes
      }
    } else {
      if (
        typeof window !== "undefined" &&
        typeof window.scrollTo === "function"
      ) {
        window.scrollTo(0, 0);
      }
      const scroller =
        articleRef.current?.closest<HTMLElement>(".explorer-main");
      if (scroller && typeof scroller.scrollTo === "function") {
        scroller.scrollTo(0, 0);
      }
    }

    const handleHashChange = () => {
      const currentHash = window.location.hash.slice(1);
      if (currentHash) {
        try {
          const decoded = decodeURIComponent(currentHash);
          setActiveFragment(decoded);
          const el = document.getElementById(decoded);
          if (el) el.scrollIntoView({ behavior: "smooth" });
        } catch {
          // Ignore
        }
      } else {
        setActiveFragment("");
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [docState, location.hash]);

  // 7. Scroll spy: observe headings using IntersectionObserver
  useEffect(() => {
    if (docState.status !== "ready") return;
    if (typeof IntersectionObserver === "undefined") return;
    const article = articleRef.current;
    if (!article) return;

    const headingElements = article.querySelectorAll<HTMLElement>(
      "h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]",
    );
    if (headingElements.length === 0) return;

    const scroller = article.closest<HTMLElement>(".explorer-main");
    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.filter((e) => e.isIntersecting);
        if (intersecting.length > 0) {
          const top = intersecting[0]!.target as HTMLElement;
          if (top.id) {
            setActiveFragment(top.id);
            if (typeof window !== "undefined") {
              const newHash = `#${encodeURIComponent(top.id)}`;
              if (window.location.hash !== newHash) {
                window.history.replaceState(null, "", newHash);
              }
            }
          }
        }
      },
      {
        root: scroller ?? null,
        rootMargin: "0px 0px -70% 0px",
        threshold: 0,
      },
    );

    headingElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [docState]);

  // 8. Local link click navigation and resolution
  const handleNavigateLink = async (href: string) => {
    if (!documentId) return;
    setLinkDiagnostic(null);

    try {
      const res = await client.resolveLink(documentId, href, project.id);
      if (res.kind === "diagnostic") {
        setLinkDiagnostic(res.diagnostic);
      } else if (res.kind === "document") {
        if (res.id === documentId) {
          if (res.fragment) {
            handleSelectHeading(res.fragment);
          }
        } else {
          const targetUrl = `/projects/${project.id}/docs/${res.id}${
            res.fragment ? `#${encodeURIComponent(res.fragment)}` : ""
          }`;
          navigate(targetUrl);
        }
      } else if (res.kind === "external") {
        if (typeof window !== "undefined") {
          window.open(res.href, "_blank", "noopener,noreferrer");
        }
      }
    } catch (err) {
      setLinkDiagnostic({
        target: href,
        code: "INVALID",
        message:
          err instanceof Error ? err.message : "Link could not be resolved.",
      });
    }
  };

  if (isInvalidDocId) {
    return <p role="alert">Invalid document identifier.</p>;
  }

  if (treeState.status === "loading") {
    return <p role="status">Loading documentation…</p>;
  }

  if (treeState.status === "error") {
    return (
      <section role="alert">
        <p>Documentation is unavailable.</p>
      </section>
    );
  }

  const tree = treeState.tree;
  const pager = documentId
    ? getPreviousNextDocuments(tree, documentId)
    : { previous: undefined, next: undefined };

  const handleSelectDoc = (id: string) => {
    setVanishedStatus(null);
    navigate(`/projects/${project.id}/docs/${id}`);
  };

  return (
    <ExplorerShell
      projectName={project.name}
      projectId={project.id}
      navigation={
        <DocTree
          nodes={tree}
          activeDocumentId={documentId}
          onSelectDocument={handleSelectDoc}
          collapsedPaths={projectCollapsed}
          onToggleCollapse={handleToggleCollapse}
          warning={treeState.warning}
        />
      }
      outline={
        docState.status === "ready" ? (
          <DocOutline
            headings={docState.document.headings}
            activeFragment={activeFragment}
            onSelectHeading={handleSelectHeading}
          />
        ) : undefined
      }
    >
      {vanishedStatus && (
        <aside
          className="doc-reader-status-banner"
          role="status"
          aria-live="polite"
        >
          <p>{vanishedStatus}</p>
        </aside>
      )}

      {docState.status === "loading" ? (
        <div className="doc-reader-loading" role="status">
          <p>Loading document…</p>
        </div>
      ) : docState.status === "error" ? (
        <section role="alert">
          <p>Document is unavailable.</p>
        </section>
      ) : docState.status === "ready" ? (
        <DocReader
          document={docState.document}
          projectName={project.name}
          previousDoc={pager.previous}
          nextDoc={pager.next}
          onSelectDoc={handleSelectDoc}
          onSelectHeading={handleSelectHeading}
          onNavigateLink={handleNavigateLink}
          activeDiagnostic={linkDiagnostic}
          articleRef={articleRef}
        />
      ) : (
        <div className="doc-reader-empty">
          <p>Select a document to begin reading.</p>
        </div>
      )}
    </ExplorerShell>
  );
}
