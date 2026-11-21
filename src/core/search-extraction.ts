import { analyzeMarkdown, markdownTokens } from "./markdown.js";
/** Derived section identity is position within a document, never a new permanent document ID. */
export interface SearchSection {
  readonly position: number;
  readonly heading: string;
  readonly fragment: string;
  readonly body: string;
  readonly code: string;
}
/** Extracted plain-text metadata; paths and project identity are supplied by approved document services. */
export interface SearchText {
  readonly title: string;
  readonly sections: readonly SearchSection[];
}
/**
 * Extract lists, paragraphs, tables and code without SQLite or remote access.
 * Conservatively omit inline blocks containing raw HTML tags, including their text;
 * code fences retain literal developer content. Heading fragments exactly match the reader.
 */
export function extractSearchText(
  markdown: string,
  fallbackTitle: string,
): SearchText {
  const outline = analyzeMarkdown(markdown).headings;
  const tokens = markdownTokens(markdown);
  const sections: SearchSection[] = [];
  let section = { position: 0, heading: "", fragment: "", body: "", code: "" };
  let headingIndex = 0;
  let title = fallbackTitle;
  let titled = false;
  const text = (token: (typeof tokens)[number]): string =>
    /<[!\p{L}/][^>]*>/u.test(token.content)
      ? ""
      : (token.children ?? [])
          .filter((child) =>
            ["text", "code_inline", "softbreak", "hardbreak"].includes(
              child.type,
            ),
          )
          .map((child) => child.content || " ")
          .join("")
          .trim();
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    if (token.type === "heading_open") {
      const heading = outline[headingIndex++];
      if (!heading) continue;
      if (section.body || section.code || section.heading)
        sections.push(section);
      const visible = tokens[i + 1] ? text(tokens[i + 1]!) : heading.title;
      if (!titled && token.tag === "h1" && visible) {
        title = visible;
        titled = true;
      }
      section = {
        position: sections.length,
        heading: visible,
        fragment: heading.fragment,
        body: "",
        code: "",
      };
      i += 2;
    } else if (token.type === "inline") section.body += text(token) + "\n";
    else if (token.type === "fence" || token.type === "code_block")
      section.code += token.content + "\n";
  }
  if (section.body || section.code || section.heading || sections.length === 0)
    sections.push(section);
  return { title, sections };
}
/** Keep whole technical identifiers and add camel-case components; punctuation uses unicode61 boundaries. */
export function searchableText(value: string): string {
  return `${value} ${value.replace(/([\p{Ll}\d])(\p{Lu})/gu, "$1 $2")}`
    .normalize("NFKC")
    .toLowerCase();
}
