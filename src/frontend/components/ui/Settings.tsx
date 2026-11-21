import { useId } from "react";
import type { ReactNode } from "react";
import { SectionHeading } from "./Presentation";
/** Composition only; controls retain their own accessible labels and persistence ownership. */
export function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="ui-setting-row">
      <div>
        <h3>{title}</h3>
        {description && <p className="ui-description">{description}</p>}
      </div>
      <div className="ui-setting-control">{children}</div>
    </div>
  );
}
export function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section className="ui-card ui-settings-section" aria-labelledby={id}>
      <SectionHeading id={id}>{title}</SectionHeading>
      {children}
    </section>
  );
}
