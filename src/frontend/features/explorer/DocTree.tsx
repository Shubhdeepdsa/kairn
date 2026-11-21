import { useState } from "react";
import type { FixtureTreeNode } from "../design-system/explorer-fixtures";
import type { NavigationEntry } from "../../lib/api/types";
import { Icon } from "../../icons/Icon";
import { Button } from "../../components/ui/Button";

export type TreeNode = NavigationEntry | FixtureTreeNode;

export interface DocTreeProps {
  readonly nodes: readonly TreeNode[];
  readonly activeDocumentId?: string | undefined;
  readonly onSelectDocument?: ((id: string) => void) | undefined;
  readonly collapsedPaths?: ReadonlySet<string> | undefined;
  readonly onToggleCollapse?: ((path: string) => void) | undefined;
  readonly defaultExpandedIds?: readonly string[] | undefined;
  readonly warning?: string | undefined;
}

/**
 * Hierarchical document tree navigation.
 * Renders nested directories, file nodes, and distinct source categories.
 * Preserves directory-before-file ordering and supports folder expansion retention.
 */
export function DocTree({
  nodes,
  activeDocumentId,
  onSelectDocument,
  collapsedPaths,
  onToggleCollapse,
  defaultExpandedIds,
  warning,
}: DocTreeProps) {
  // If defaultExpandedIds is explicitly provided (e.g. in specimen fixture), track expanded IDs.
  // Otherwise, default to all-open behavior with a collapsed set.
  const isFixtureMode =
    defaultExpandedIds !== undefined && collapsedPaths === undefined;
  const [fixtureExpanded, setFixtureExpanded] = useState<ReadonlySet<string>>(
    () => new Set(defaultExpandedIds ?? []),
  );
  const [internalCollapsed, setInternalCollapsed] = useState<
    ReadonlySet<string>
  >(() => new Set());

  const isControlled = collapsedPaths !== undefined;
  const currentCollapsed = isControlled ? collapsedPaths : internalCollapsed;

  const toggleDirectory = (node: TreeNode) => {
    const key = node.path;
    if (isFixtureMode && "id" in node && typeof node.id === "string") {
      setFixtureExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(node.id as string)) next.delete(node.id as string);
        else next.add(node.id as string);
        return next;
      });
      return;
    }

    if (onToggleCollapse) {
      onToggleCollapse(key);
    }
    if (!isControlled) {
      setInternalCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    }
  };

  const isExpanded = (node: TreeNode) => {
    if (isFixtureMode && "id" in node && typeof node.id === "string") {
      return fixtureExpanded.has(node.id as string);
    }
    return !currentCollapsed.has(node.path);
  };

  if (nodes.length === 0) {
    return (
      <nav
        className="doc-tree doc-tree-empty"
        aria-label="Documentation hierarchy"
      >
        {warning && (
          <div className="doc-tree-warning" role="status">
            <Icon name="wayfinding" className="icon-sm" />
            <span>{warning}</span>
          </div>
        )}
        <p className="doc-tree-empty-message">No documentation files found.</p>
      </nav>
    );
  }

  // Group nodes if source headers are present (e.g. in fixtures)
  const mainNodes = nodes.filter((n) => !("source" in n) || !n.source);
  const additionalNodes = nodes.filter(
    (n) => "source" in n && n.source === "Additional Sources",
  );

  const renderNode = (node: TreeNode, depth = 0) => {
    if (node.kind === "directory") {
      const expanded = isExpanded(node);
      const key = `dir:${node.path}`;
      return (
        <li key={key} className="doc-tree-branch" data-depth={depth}>
          <Button
            variant="ghost"
            className="doc-tree-folder-btn"
            aria-expanded={expanded}
            title={node.path}
            onClick={() => toggleDirectory(node)}
          >
            <span className="doc-tree-item-leading">
              <Icon
                name={expanded ? "folderOpen" : "folder"}
                className="icon-sm"
              />
              <span className="doc-tree-item-title">{node.title}</span>
            </span>
            <Icon
              name={expanded ? "chevronDown" : "chevronRight"}
              className="icon-sm doc-tree-chevron"
            />
          </Button>
          {expanded && node.children && (
            <ul className="doc-tree-children">
              {node.children.map((child) => renderNode(child, depth + 1))}
            </ul>
          )}
        </li>
      );
    }

    const docId = node.id;
    const isActive = activeDocumentId === docId;
    return (
      <li key={docId} className="doc-tree-leaf" data-depth={depth}>
        <Button
          variant="ghost"
          className="doc-tree-file-btn"
          data-active={isActive ? "true" : "false"}
          aria-current={isActive ? "page" : undefined}
          title={node.path}
          onClick={() => onSelectDocument?.(docId)}
        >
          {isActive && (
            <span className="doc-tree-active-bar" aria-hidden="true" />
          )}
          <span className="doc-tree-item-leading">
            <Icon name="file" className="icon-sm" />
            <span className="doc-tree-item-title">{node.title}</span>
          </span>
          {isActive && (
            <span className="doc-tree-active-dot" aria-hidden="true" />
          )}
        </Button>
      </li>
    );
  };

  return (
    <nav className="doc-tree" aria-label="Documentation hierarchy">
      {warning && (
        <div className="doc-tree-warning" role="status">
          <Icon name="wayfinding" className="icon-sm" />
          <span>{warning}</span>
        </div>
      )}

      <div className="doc-tree-section">
        <div className="doc-tree-section-header">
          <span className="doc-tree-section-title">Navigation tree</span>
        </div>
        <ul className="doc-tree-list">
          {mainNodes.map((node) => renderNode(node, 0))}
        </ul>
      </div>

      {additionalNodes.length > 0 && (
        <div className="doc-tree-section doc-tree-additional">
          <div className="doc-tree-section-header">
            <span className="doc-tree-section-title">Additional sources</span>
          </div>
          <ul className="doc-tree-list">
            {additionalNodes.map((node) => renderNode(node, 0))}
          </ul>
        </div>
      )}
    </nav>
  );
}
