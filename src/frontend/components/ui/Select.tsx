import type { ComponentPropsWithRef } from "react";
import { Field } from "./Field";
/** Native select preserves platform keyboard behavior and form reset semantics. */
export interface SelectProps extends ComponentPropsWithRef<"select"> {
  label: string;
  description?: string;
  error?: string;
}
export function Select({
  label,
  description,
  error,
  id,
  className = "",
  children,
  ...props
}: SelectProps) {
  return (
    <Field
      label={label}
      {...(id ? { id } : {})}
      {...(description ? { description } : {})}
      {...(error ? { error } : {})}
    >
      {(field) => (
        <select
          {...props}
          {...field}
          className={`ui-input ${className}`.trim()}
        >
          {children}
        </select>
      )}
    </Field>
  );
}
