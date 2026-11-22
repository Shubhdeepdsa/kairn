import { Suspense } from "react";
import { ThemeProvider } from "./providers/ThemeProvider";
import { ApplicationProvider } from "./providers/ApplicationProvider";
import { ErrorBoundary } from "./ErrorBoundary";
import { ApplicationRoutes } from "./router";
import { createApiClient } from "../lib/api/client";
import type { ApiClient } from "../lib/api/client";
const defaultClient = createApiClient();
/** Minimal application composition. Router ownership stays with the browser entry. */
export function App({ client = defaultClient }: { client?: ApiClient }) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ApplicationProvider client={client}>
          <Suspense fallback={<p role="status">Loading documentation view…</p>}>
            <ApplicationRoutes />
          </Suspense>
        </ApplicationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
