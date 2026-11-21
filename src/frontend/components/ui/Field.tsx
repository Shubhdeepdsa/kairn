import { useId } from "react";
import type { ReactNode } from "react";
/** Internal field composition; the render function receives the shared label/error relationships. */
export function Field({
  label,
  id,
  description,
  error,
  children,
}: {
  label: string;
  id?: string;
  description?: string;
  error?: string;
  children(props: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: true;
  }): ReactNode;
}) {
  const generated = useId();
  const controlId = id ?? generated;
  const helpId = controlId + "-help";
  const errorId = controlId + "-error";
  return (
    <div className="ui-field">
      <label htmlFor={controlId}>{label}</label>
      {children({
        id: controlId,
        ...(description || error
          ? {
              "aria-describedby": [
                description ? helpId : "",
                error ? errorId : "",
              ]
                .filter(Boolean)
                .join(" "),
            }
          : {}),
        ...(error ? { "aria-invalid": true as const } : {}),
      })}
      {description && (
        <p id={helpId} className="ui-description">
          {description}
        </p>
      )}
      {error && (
        <p id={errorId} className="ui-error">
          {error}
        </p>
      )}
    </div>
  );
}
