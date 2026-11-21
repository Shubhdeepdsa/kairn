import { useId } from "react";
import type { ComponentPropsWithRef } from "react";
/** Native checkbox behavior with switch semantics; supports checked/onChange or defaultChecked and forms. */
export interface SwitchProps extends Omit<
  ComponentPropsWithRef<"input">,
  "type" | "role" | "size"
> {
  label: string;
  description?: string;
  error?: string;
}
export function Switch({
  label,
  description,
  error,
  id,
  className = "",
  ...props
}: SwitchProps) {
  const generated = useId();
  const control = id ?? generated;
  return (
    <div className="ui-switch-field">
      <label htmlFor={control} className="ui-switch-label">
        <input
          {...props}
          id={control}
          type="checkbox"
          role="switch"
          aria-invalid={error ? true : undefined}
          aria-describedby={
            description || error ? control + "-help" : undefined
          }
          className={`ui-switch ${className}`.trim()}
        />
        <span>{label}</span>
      </label>
      {(description || error) && (
        <p
          id={control + "-help"}
          className={error ? "ui-error" : "ui-description"}
        >
          {error ?? description}
        </p>
      )}
    </div>
  );
}
