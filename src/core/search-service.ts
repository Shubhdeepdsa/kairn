import { Worker } from "node:worker_threads";
import type { SearchOptions } from "./search-coordinator.js";
import type { SearchRequest, SearchResponse } from "./search-contracts.js";
import { searchTerms } from "./search-query.js";
/**
 * Lazy off-thread search API with bounded, coalesced jobs.
 * Worker failure rejects outstanding jobs; the next search starts a replacement.
 * SQLite work never blocks the reader thread.
 */
export class SearchService {
  private worker: Worker | undefined;
  private sequence = 0;
  private closed = false;
  private pending = new Map<
    number,
    { resolve(value: SearchResponse): void; reject(error: Error): void }
  >();
  private requests = new Map<string, Promise<SearchResponse>>();
  constructor(private readonly options: SearchOptions) {}
  search(request: SearchRequest): Promise<SearchResponse> {
    searchTerms(request);
    if (this.closed) return Promise.reject(new Error("Search is closed."));
    const key = JSON.stringify(request);
    const existing = this.requests.get(key);
    if (existing) return existing;
    if (this.pending.size >= 8)
      return Promise.reject(new Error("Search is busy. Retry shortly."));
    if (!this.worker) {
      const worker = new Worker(
        new URL("./search-worker.js", import.meta.url),
        {
          workerData: this.options,
        },
      );
      this.worker = worker;
      worker.on(
        "message",
        (message: { id: number; response: SearchResponse; error?: string }) => {
          if (this.worker !== worker) return;
          const job = this.pending.get(message.id);
          this.pending.delete(message.id);
          if (message.error) job?.reject(new Error(message.error));
          else job?.resolve(message.response);
        },
      );
      const failed = (): void => {
        // An old worker's later exit must not invalidate its replacement's jobs.
        if (this.worker !== worker) return;
        this.worker = undefined;
        this.requests.clear();
        for (const job of this.pending.values())
          job.reject(new Error("Search worker stopped. Retry search."));
        this.pending.clear();
      };
      worker.on("error", failed);
      worker.on("exit", failed);
    }
    const id = ++this.sequence;
    const promise = new Promise<SearchResponse>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage({ id, request });
    }).finally(() => {
      if (this.requests.get(key) === promise) this.requests.delete(key);
    });
    this.requests.set(key, promise);
    return promise;
  }
  /** Bounded graceful shutdown drains jobs; termination rolls back any uncommitted SQLite transaction. */
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    const worker = this.worker;
    if (!worker) return;
    const id = ++this.sequence;
    const done = new Promise<void>((resolve) => {
      worker.once("exit", () => resolve());
      worker.postMessage({ id, close: true });
    });
    let timeout: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      done,
      new Promise<void>((resolve) => {
        timeout = setTimeout(() => {
          void worker.terminate().then(() => resolve());
        }, 1500);
      }),
    ]);
    if (timeout) clearTimeout(timeout);
  }
}
