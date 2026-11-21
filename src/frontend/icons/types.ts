import type { ComponentType, SVGProps } from "react";
/**
 * Provider-neutral SVG contract. Custom icons forward these props onto their root
 * svg, supply a viewBox, and use currentColor. Icon owns sizing and accessibility.
 * Do not bake in a title, color, inline style or focus behavior in registry entries.
 */
export type SvgIconProps = SVGProps<SVGSVGElement>;
/** Accepts ordinary custom SVG components as well as Lucide's ref-capable components. */
export type SvgIconComponent = ComponentType<SvgIconProps>;
