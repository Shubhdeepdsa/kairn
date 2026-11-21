import type { ComponentPropsWithRef, ReactNode } from "react";
/** Semantic status, with text labels so color is never the sole signal. */
export function Badge({
  tone = "neutral",
  className = "",
  ...props
}: ComponentPropsWithRef<"span"> & {
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
}) {
  return (
    <span
      {...props}
      className={`ui-badge ${className}`.trim()}
      data-tone={tone}
    />
  );
}
export function Card({
  className = "",
  ...props
}: ComponentPropsWithRef<"div">) {
  return <div {...props} className={`ui-card ${className}`.trim()} />;
}
export function Divider(props: ComponentPropsWithRef<"hr">) {
  return (
    <hr {...props} className={`ui-divider ${props.className ?? ""}`.trim()} />
  );
}
/** Shared section marker and heading hierarchy; callers choose the semantic level. */
export function SectionHeading({
  children,
  level = 2,
  id,
}: {
  children: ReactNode;
  level?: 2 | 3;
  id?: string;
}) {
  const Tag = level === 2 ? "h2" : "h3";
  return (
    <Tag id={id} className="ui-section-heading">
      {children}
    </Tag>
  );
}
