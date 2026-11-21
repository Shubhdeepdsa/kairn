import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { ApiClient } from "../../lib/api/client";
import type { SearchProject } from "../../../core/search-contracts.js";
import { Button } from "../../components/ui/Button";
/** A single owner of startup server data; views derive project identity instead of duplicating stores. */
export interface ApplicationData {
  readonly current: SearchProject;
  readonly projects: readonly SearchProject[];
}
const ApplicationContext = createContext<ApplicationData | null>(null);
const ApiContext = createContext<ApiClient | null>(null);

type Resource =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: ApplicationData };
export function ApplicationProvider({
  client,
  children,
}: {
  client: ApiClient;
  children: ReactNode;
}) {
  const [resource, setResource] = useState<Resource>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      client.getContext(controller.signal),
      client.getProjects(controller.signal),
    ])
      .then(([current, projects]) => {
        if (!controller.signal.aborted)
          setResource({ status: "ready", data: { current, projects } });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResource({ status: "error" });
      });
    return () => controller.abort();
  }, [client, attempt]);
  if (resource.status === "loading")
    return <p role="status">Loading application context…</p>;
  if (resource.status === "error")
    return (
      <section role="alert">
        <p>Application context is unavailable.</p>
        <Button
          onClick={() => {
            setResource({ status: "loading" });
            setAttempt((value) => value + 1);
          }}
        >
          Retry connection
        </Button>
      </section>
    );
  return (
    <ApiContext value={client}>
      <ApplicationContext value={resource.data}>{children}</ApplicationContext>
    </ApiContext>
  );
}
export function useApplication(): ApplicationData {
  const value = useContext(ApplicationContext);
  if (!value) throw new Error("ApplicationProvider is required.");
  return value;
}
export function useApiClient(): ApiClient {
  const value = useContext(ApiContext);
  if (!value) throw new Error("ApiClient is required.");
  return value;
}
