import MarkdownIt from "markdown-it";

/** Reusable deterministic heading outline; IDs use the existing slug algorithm. */
export interface Heading {
  readonly level: number;
  readonly title: string;
  readonly fragment: string;
}
/** One bounded Markdown analysis, shared by safe rendering and local diagnostics. */
export interface MarkdownAnalysis {
  readonly html: string;
  readonly headings: readonly Heading[];
  readonly links: readonly string[];
}

const parser = new MarkdownIt({
  html: false,
  linkify: false,
  typographer: false,
});
const defaultValidate = parser.validateLink.bind(parser);
parser.validateLink = (url: string): boolean => {
  if (
    !defaultValidate(url) ||
    /[\\\u0000-\u0020\u007f]/.test(url) ||
    url.startsWith("//")
  )
    return false;
  const scheme = /^([a-z][a-z\d+.-]*):/i.exec(url)?.[1];
  return (
    scheme === undefined ||
    ["http", "https", "mailto"].includes(scheme.toLowerCase())
  );
};
parser.renderer.rules.image = (tokens, index) =>
  parser.utils.escapeHtml(`[Image: ${tokens[index]?.content ?? ""}]`);
parser.renderer.rules.link_open = (tokens, index, options, env, renderer) => {
  const token = tokens[index];
  if (token) {
    const href = String(token.attrGet("href") ?? "");
    if (
      Array.isArray(env?.links) &&
      env.links.length < 129 &&
      !env.links.includes(href)
    )
      env.links.push(href);
    token.attrSet("rel", "noopener noreferrer");
    token.attrSet("referrerpolicy", "no-referrer");
    if (/^(https?:|mailto:)/i.test(String(token.attrGet("href") ?? "")))
      token.attrSet("target", "_blank");
  }
  return renderer.renderToken(tokens, index, options);
};
parser.renderer.rules.heading_open = (
  tokens,
  index,
  options,
  env,
  renderer,
) => {
  const heading = tokens[index + 1]?.content ?? "";
  const base =
    heading
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-") || "section";
  const ids = env?.headingIds;
  if (ids instanceof Map) {
    const count = Number(ids.get(base) ?? 0);
    ids.set(base, count + 1);
    const fragment = count ? `${base}-${count}` : base;
    tokens[index]?.attrSet("id", fragment);
    if (Array.isArray(env?.headings))
      env.headings.push({
        level: Number(tokens[index]?.tag.slice(1)),
        title: heading,
        fragment,
      });
  }
  return renderer.renderToken(tokens, index, options);
};

/**
 * Render untrusted Markdown without raw HTML, executable URLs, or image loading.
 * No plugins or user-supplied renderer functions are enabled. Pair with the server CSP.
 * @param markdown - Bounded UTF-8 source supplied by the document engine.
 * @returns HTML suitable for the viewer article; raw HTML appears as text.
 */
export function renderMarkdown(markdown: string): string {
  return analyzeMarkdown(markdown).html;
}

/** Analyze headings and at most 129 link targets without fetching any URLs. */
export function analyzeMarkdown(markdown: string): MarkdownAnalysis {
  const env = {
    headingIds: new Map<string, number>(),
    headings: [] as Heading[],
    links: [] as string[],
  };
  const html = parser.render(markdown, env);
  return { html, headings: env.headings, links: [...new Set(env.links)] };
}
