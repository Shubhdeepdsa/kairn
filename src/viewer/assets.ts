import { readFile } from "node:fs/promises";
import type { ViewerPresentation } from "../server/http.js";
import { renderMarkdown } from "./markdown.js";

const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kairn · Documentation</title><link rel="stylesheet" href="/viewer.css"><script type="module" src="/viewer.js"></script></head>
<body><a class="skip" href="#document">Skip to document</a><header><strong>◇ Kairn</strong><span>Local documentation</span></header>
<div class="layout"><aside><h2>Documents</h2><nav id="navigation" aria-label="Documentation"></nav></aside>
<main><p id="source" class="source"></p><p id="status" role="status" aria-live="polite">Loading documentation…</p><article id="document" tabindex="-1" aria-label="Document content"></article></main></div></body></html>`;
const style = `:root{font:16px/1.65 system-ui,sans-serif;color:#21312d;background:#fafbf9}*{box-sizing:border-box}body{margin:0}header{padding:1rem 1.5rem;border-bottom:1px solid #d8dfd9;display:flex;gap:1.5rem;align-items:center;background:#fff}header strong{font-size:1.35rem}header span,.source{color:#52665c;font-size:.85rem}.layout{display:grid;grid-template-columns:260px minmax(0,1fr);min-height:calc(100vh - 70px)}aside{padding:1.25rem;background:#f1f4ef;border-right:1px solid #d8dfd9}aside h2{font-size:.85rem;text-transform:uppercase;letter-spacing:.08em}nav ul{list-style:none;margin:0;padding:0}nav ul ul{padding-left:1rem}nav a,summary{display:block;padding:.3rem .5rem;overflow-wrap:anywhere}nav a{text-decoration:none;color:#294e41;border-radius:4px}summary{cursor:pointer}nav a:hover,nav a[aria-current=page]{background:#dce8dd}nav a[aria-current=page]{font-weight:700}main{padding:1.5rem clamp(1rem,4vw,4rem);min-width:0}article{max-width:850px;overflow-wrap:anywhere}article h1,article h2,article h3{line-height:1.25;scroll-margin-top:1rem}article h1{font-size:2rem}article a{color:#17624c}pre{background:#eaf0e9;padding:1rem;border-radius:5px;overflow:auto;font-size:.88rem}code{font-family:ui-monospace,monospace}table{display:block;overflow:auto;border-collapse:collapse}th,td{border:1px solid #cbd5cb;padding:.5rem .75rem;text-align:left}blockquote{border-left:3px solid #97ae9e;margin-left:0;padding-left:1rem;color:#52665c}:focus-visible{outline:2px solid #17624c;outline-offset:3px}.skip{position:absolute;left:1rem;top:-4rem;background:white;padding:.5rem}.skip:focus{top:.5rem}[aria-busy=true]{opacity:.6}#status{color:#52665c}@media(max-width:680px){.layout{display:block}aside{border-right:0;border-bottom:1px solid #d8dfd9;max-height:35vh;overflow:auto}main{padding:1rem}header{padding:.8rem 1rem}}`;

/** Load only the compiled browser module packaged beside these assets, never project files. */
export async function loadViewerPresentation(): Promise<ViewerPresentation> {
  const script = await readFile(
    new URL("./client.js", import.meta.url),
    "utf8",
  );
  return { page, style, script, renderMarkdown };
}
