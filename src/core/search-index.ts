import { DatabaseSync } from "node:sqlite";
import { chmod, lstat, mkdir, realpath, rename } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { assertRealPath } from "./config/storage.js";
import { extractSearchText, searchableText } from "./search-extraction.js";
import type { SearchText } from "./search-extraction.js";
/** Approved metadata supplied by the coordinator; no arbitrary path is read by the index. */
export interface IndexDocument {
  readonly projectId: string;
  readonly documentId: string;
  readonly sourceId: string;
  readonly path: string;
  readonly title: string;
  readonly revision: string;
  readonly markdown: string;
}
/** Rebuildable derived FTS storage. Methods are synchronous and belong in a job worker, not the HTTP thread. */
export class SearchIndex {
  private constructor(
    readonly database: DatabaseSync,
    readonly recovered: boolean,
  ) {}
  /**
   * Lazily open private derived storage. SQLite serializes writers with a bounded busy timeout.
   * Schema changes rebuild transactionally. Offline corrupt bytes are quarantined, never config files.
   * A competing recovery returns an error rather than renaming a live replacement.
   */
  static async open(directory: string): Promise<SearchIndex> {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const root = await realpath(directory);
    await assertRealPath(root);
    const file = join(root, "search.sqlite");
    await assertRealPath(file, true);
    try {
      if (!(await lstat(file)).isFile())
        throw new Error("Search cache must be a regular file.");
    } catch (error) {
      if (!(
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ))
        throw error;
    }
    const connect = (): DatabaseSync =>
      new DatabaseSync(file, { timeout: 250 });
    let db = connect();
    let recovered = false;
    try {
      db.prepare("PRAGMA schema_version").get();
    } catch (error) {
      db.close();
      const code =
        error instanceof Error && "errcode" in error
          ? error.errcode
          : undefined;
      if (code !== 11 && code !== 26) throw error;
      // Exclusive recovery lock is intentionally not stolen after a crash. Retry after inspection.
      const { open, rm } = await import("node:fs/promises");
      const lock = join(root, "search-recovery.lock");
      const handle = await open(lock, "wx", 0o600);
      try {
        db = connect();
        try {
          db.prepare("PRAGMA schema_version").get();
        } catch {
          db.close();
          await rename(file, file + ".corrupt-" + randomUUID());
          db = connect();
          recovered = true;
        }
      } finally {
        await handle.close();
        await rm(lock);
      }
    }
    try {
      await chmod(file, 0o600);
      db.exec("PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL;");
      db.exec("BEGIN IMMEDIATE");
      try {
        const version = Number(
          db.prepare("PRAGMA user_version").get()!["user_version"],
        );
        if (version !== 1) {
          db.exec(`DROP TABLE IF EXISTS sections; DROP TABLE IF EXISTS documents;
            CREATE TABLE documents(project TEXT NOT NULL, document TEXT NOT NULL, revision TEXT NOT NULL, metadata TEXT NOT NULL, PRIMARY KEY(project, document));
            CREATE VIRTUAL TABLE sections USING fts5(project UNINDEXED, document UNINDEXED, position UNINDEXED, fragment UNINDEXED, label UNINDEXED, document_title UNINDEXED, original_body UNINDEXED, original_code UNINDEXED, title, heading, path, body, code, tokenize='unicode61 remove_diacritics 2');
            PRAGMA user_version=1;`);
        }
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      return new SearchIndex(db, recovered);
    } catch (error) {
      db.close();
      throw error;
    }
  }
  /** Replace only changed content/metadata, atomically removing obsolete sections. Returns whether extraction occurred. */
  put(document: IndexDocument): boolean {
    const d = document;
    const metadata = JSON.stringify({
      sourceId: d.sourceId,
      path: d.path,
      title: d.title,
    });
    const previous = this.database
      .prepare(
        "SELECT revision, metadata FROM documents WHERE project=? AND document=?",
      )
      .get(d.projectId, d.documentId);
    if (previous?.revision === d.revision && previous.metadata === metadata)
      return false;
    const extracted = extractSearchText(d.markdown, d.title);
    if (
      extracted.sections.length > 512 ||
      extracted.title.length > 512 ||
      extracted.sections.some(
        (s) => s.heading.length > 512 || s.fragment.length > 512,
      )
    )
      throw new Error("Search document exceeds section or heading limits.");
    this.replace(d, metadata, extracted);
    return true;
  }
  private replace(d: IndexDocument, metadata: string, text: SearchText): void {
    const db = this.database;
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("DELETE FROM sections WHERE project=? AND document=?").run(
        d.projectId,
        d.documentId,
      );
      const insert = db.prepare(
        "INSERT INTO sections VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      );
      for (const s of text.sections)
        insert.run(
          d.projectId,
          d.documentId,
          s.position,
          s.fragment,
          s.heading,
          text.title,
          s.body,
          s.code,
          searchableText(text.title),
          searchableText(s.heading),
          searchableText(d.path),
          searchableText(s.body),
          searchableText(s.code),
        );
      db.prepare("INSERT OR REPLACE INTO documents VALUES (?, ?, ?, ?)").run(
        d.projectId,
        d.documentId,
        d.revision,
        metadata,
      );
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  /** Prune entries not in the currently approved set; an empty set purges a project's cache. */
  prune(projectId: string, approved: ReadonlySet<string>): void {
    const db = this.database;
    db.exec("BEGIN IMMEDIATE");
    try {
      const existing = db
        .prepare("SELECT document FROM documents WHERE project=?")
        .all(projectId);
      for (const row of existing)
        if (!approved.has(String(row.document))) {
          db.prepare("DELETE FROM sections WHERE project=? AND document=?").run(
            projectId,
            String(row.document),
          );
          db.prepare(
            "DELETE FROM documents WHERE project=? AND document=?",
          ).run(projectId, String(row.document));
        }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  /** Remove unregistered projects; transient sessions are separate callers' responsibility. */
  retainProjects(ids: ReadonlySet<string>): void {
    for (const row of this.database
      .prepare("SELECT DISTINCT project FROM documents")
      .all())
      if (!ids.has(String(row.project)))
        this.prune(String(row.project), new Set());
  }
  /** Close every SQLite handle before worker/process shutdown. */
  close(): void {
    this.database.close();
  }
}
