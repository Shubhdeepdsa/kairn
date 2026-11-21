import type { ComponentPropsWithRef } from "react";
import { Field } from "./Field";
/** Native controlled/uncontrolled value and ref behavior; label/error relationships are owned here. */
export interface TextInputProps extends Omit<
  ComponentPropsWithRef<"input">,
  "size"
> {
  label: string;
  description?: string;
  error?: string;
}
export function TextInput({
  label,
  description,
  error,
  id,
  className = "",
  ...props
}: TextInputProps) {
  return (
    <Field
      label={label}
      {...(id ? { id } : {})}
      {...(description ? { description } : {})}
      {...(error ? { error } : {})}
    >
      {(field) => (
        <input
          {...props}
          {...field}
          className={`ui-input ${className}`.trim()}
        />
      )}
    </Field>
  );
}
