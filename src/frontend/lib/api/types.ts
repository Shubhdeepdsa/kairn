/**
 * Browser-safe API response contracts for Documentation Explorer.
 * These mirror server contracts without importing Node or core filesystem services.
 */

export interface DocumentEntry {
  readonly kind: "document";
  readonly id: string;
  readonly path: string;
  readonly title: string;
  readonly sourceId?: string | undefined;
  readonly legacyId?: string | undefined;
  readonly projectPath?: string | undefined;
}

export interface DirectoryEntry {
  readonly kind: "directory";
  readonly path: string;
  readonly title: string;
  readonly children: readonly NavigationEntry[];
}

export type NavigationEntry = DirectoryEntry | DocumentEntry;

export interface TreeResponse {
  readonly tree: readonly NavigationEntry[];
  readonly warning?: string | undefined;
}

export interface DocumentHeading {
  readonly level: number;
  readonly title: string;
  readonly fragment: string;
}

export interface LinkDiagnostic {
  readonly line: number;
  readonly column: number;
  readonly target: string;
  readonly code: string;
  readonly message: string;
}

export interface DocumentResponse {
  readonly id: string;
  readonly path: string;
  readonly title: string;
  readonly revision: string;
  readonly markdown: string;
  readonly headings: readonly DocumentHeading[];
  readonly diagnostics: readonly LinkDiagnostic[];
  readonly html?: string | undefined;
}

export type LinkResolution =
  | {
      readonly kind: "document";
      readonly id: string;
      readonly fragment: string;
    }
  | { readonly kind: "external"; readonly href: string }
  | { readonly kind: "diagnostic"; readonly diagnostic: LinkDiagnostic };
