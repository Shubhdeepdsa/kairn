import type { SvgIconProps } from "../types";
/** Original knowledge-wayfinding glyph, not a replacement for the approved brand mark. */
export function Wayfinding(props: SvgIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      {...props}
    >
      <path d="M12 3v18M5 7h14l-3-3M19 15H5l3 3" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  );
}
