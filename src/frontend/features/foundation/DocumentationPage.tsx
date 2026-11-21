import { useParams } from "react-router";
import { readerHash } from "../../../core/reader-location.js";
import { useWorkspace } from "../../layouts/WorkspaceLayout";
export function DocumentationPage() {
  const { documentId } = useParams();
  const project = useWorkspace();
  if (documentId && !/^[a-f0-9]{64}$/.test(documentId))
    return <p role="alert">Invalid document identifier.</p>;
  return (
    <section>
      <h2>Documentation workspace foundation</h2>
      <p>
        The React Documentation Explorer is deferred to Phase 6C. Read and
        search using the working viewer.
      </p>
      <a
        href={"/" + (documentId ? readerHash(documentId, "", project.id) : "")}
      >
        {documentId
          ? "Open document in the working reader"
          : "Open existing reader (startup project)"}
      </a>
    </section>
  );
}
