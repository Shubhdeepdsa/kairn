import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useWorkspace } from "../../layouts/WorkspaceLayout";
import { useApiClient } from "../../app/providers/ApplicationProvider";
import { ExplorerShell } from "../explorer/ExplorerShell";
import { DocTree } from "../explorer/DocTree";
import { DocReader } from "../explorer/DocReader";
import { DocOutline } from "../explorer/DocOutline";
import {
  findDefaultDocument,
  getPreviousNextDocuments,
} from "../explorer/navigation-tree";
import type { NavigationEntry, DocumentResponse } from "../../lib/api/types";

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
  const project = useWorkspace();
  const client = useApiClient();
  const navigate = useNavigate();

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

  // 1. Fetch project tree on project change
  useEffect(() => {
    if (isInvalidDocId) return;
    const controller = new AbortController();
    setTreeState({ status: "loading" });

    client
      .getTree(project.id, controller.signal)
      .then((res) => {
        if (!controller.signal.aborted) {
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

  // 2. Select default document if no documentId is in URL once tree is ready
  useEffect(() => {
    if (isInvalidDocId) return;
    if (treeState.status === "ready" && !documentId) {
      const defaultDoc = findDefaultDocument(treeState.tree);
      if (defaultDoc) {
        navigate(`/projects/${project.id}/docs/${defaultDoc.id}`, {
          replace: true,
        });
      }
    }
  }, [treeState, documentId, project.id, navigate, isInvalidDocId]);

  // 3. Fetch active document when documentId changes
  useEffect(() => {
    if (!documentId || isInvalidDocId) {
      setDocState({ status: "idle" });
      return;
    }

    const controller = new AbortController();
    setDocState({ status: "loading" });
    setActiveFragment("");

    client
      .getDocument(documentId, project.id, controller.signal)
      .then((doc) => {
        if (!controller.signal.aborted) {
          setDocState({ status: "ready", document: doc });
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
    navigate(`/projects/${project.id}/docs/${id}`);
  };

  return (
    <ExplorerShell
      projectName={project.name}
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
        docState.status === "ready" && docState.document.headings.length > 0 ? (
          <DocOutline
            headings={docState.document.headings}
            activeFragment={activeFragment}
            onSelectHeading={(frag) => setActiveFragment(frag)}
          />
        ) : undefined
      }
    >
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
        />
      ) : (
        <div className="doc-reader-empty">
          <p>Select a document to begin reading.</p>
        </div>
      )}
    </ExplorerShell>
  );
}
