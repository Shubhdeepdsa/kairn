import { parentPort, workerData } from "node:worker_threads";
import { SearchCoordinator } from "./search-coordinator.js";
import type { SearchOptions } from "./search-coordinator.js";
import type { SearchRequest } from "./search-contracts.js";
const coordinator = new SearchCoordinator(workerData as SearchOptions);
parentPort!.on(
  "message",
  (message: { id: number; request?: SearchRequest; close?: boolean }) => {
    void (async () => {
      try {
        if (message.close) {
          await coordinator.close();
          parentPort!.postMessage({ id: message.id });
          parentPort!.close();
        } else
          parentPort!.postMessage({
            id: message.id,
            response: await coordinator.search(message.request!),
          });
      } catch {
        parentPort!.postMessage({
          id: message.id,
          error:
            "Search is temporarily unavailable. Retry after checking the local cache and project configuration.",
        });
      }
    })();
  },
);
