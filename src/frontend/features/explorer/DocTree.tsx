import { useState } from "react";
import type { FixtureTreeNode } from "../design-system/explorer-fixtures";
import { Icon } from "../../icons/Icon";
import { Button } from "../../components/ui/Button";

export interface DocTreeProps {
  readonly nodes: readonly FixtureTreeNode[];
  readonly activeDocumentId?: string | undefined;
  readonly onSelectDocument?: ((id: string) => void) | undefined;
  readonly defaultExpandedIds?: readonly string[] | undefined;
}

/**
 * Hierarchical document tree navigation.
 * Renders nested directories, file nodes, and distinct source categories.
 */
export function DocTree({
  nodes,
  activeDocumentId,
  onSelectDocument,
  defaultExpandedIds = ["marketing-backend:dir:architecture"],
}: DocTreeProps) {
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(
    () => new Set(defaultExpandedIds),
  );

  const toggleDirectory = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Group nodes by source or main tree
  const mainNodes = nodes.filter((n) => !n.source);
  const additionalNodes = nodes.filter(
    (n) => n.source === "Additional Sources",
  );

  const renderNode = (node: FixtureTreeNode, depth = 0) => {
    if (node.kind === "directory") {
      const isExpanded = expandedIds.has(node.id);
      return (
        <li key={node.id} className="doc-tree-branch" data-depth={depth}>
          <Button
            variant="ghost"
            className="doc-tree-folder-btn"
            aria-expanded={isExpanded}
            onClick={() => toggleDirectory(node.id)}
          >
            <div className="doc-tree-item-leading">
              <Icon
                name={isExpanded ? "folderOpen" : "folder"}
                className="icon-sm"
              />
              <span className="doc-tree-item-title">{node.title}</span>
            </div>
            <Icon
              name={isExpanded ? "chevronDown" : "chevronRight"}
              className="icon-sm doc-tree-chevron"
            />
          </Button>
          {isExpanded && node.children && (
            <ul className="doc-tree-children">
              {node.children.map((child) => renderNode(child, depth + 1))}
            </ul>
          )}
        </li>
      );
    }

    const isActive = activeDocumentId === node.id;
    return (
      <li key={node.id} className="doc-tree-leaf" data-depth={depth}>
        <Button
          variant="ghost"
          className="doc-tree-file-btn"
          data-active={isActive ? "true" : "false"}
          aria-current={isActive ? "page" : undefined}
          onClick={() => onSelectDocument?.(node.id)}
        >
          {isActive && (
            <span className="doc-tree-active-bar" aria-hidden="true" />
          )}
          <div className="doc-tree-item-leading">
            <Icon name="file" className="icon-sm" />
            <span className="doc-tree-item-title">{node.title}</span>
          </div>
          {isActive && (
            <span className="doc-tree-active-dot" aria-hidden="true" />
          )}
        </Button>
      </li>
    );
  };

  return (
    <nav className="doc-tree" aria-label="Documentation hierarchy">
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
