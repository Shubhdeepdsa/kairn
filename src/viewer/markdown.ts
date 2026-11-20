import MarkdownIt from "markdown-it";

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
parser.renderer.rules.link_open = (tokens, index, options, _env, renderer) => {
  const token = tokens[index];
  if (token) {
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
    tokens[index]?.attrSet("id", count ? `${base}-${count}` : base);
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
  return parser.render(markdown, { headingIds: new Map<string, number>() });
}
