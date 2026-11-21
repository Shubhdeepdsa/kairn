import { loadFrontendPresentation } from "../server/frontend-assets.js";
import { readFile } from "node:fs/promises";
import type { ViewerPresentation } from "../server/http.js";
import { renderMarkdown } from "./markdown.js";

const page = `<!doctype html>
<html lang="en" data-kairn-application="true"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kairn · Documentation</title><link rel="stylesheet" href="/viewer.css"><script type="module" src="/viewer.js"></script></head>
<body><a class="skip" href="#document">Skip to document</a><header><strong>◇ Kairn</strong><span id="project-context">Local documentation</span><button id="search-open" type="button" aria-label="Search documentation (Command or Control K)">Search · ⌘/Ctrl K</button></header>
<div class="layout"><aside><h2>Documents</h2><nav id="navigation" aria-label="Documentation"></nav></aside>
<main><p id="source" class="source"></p><p id="status" role="status" aria-live="polite">Loading documentation…</p><details id="document-outline"><summary>On this page</summary><nav id="outline" aria-label="Document outline"></nav></details><section id="diagnostics" aria-label="Link warnings" hidden></section><article id="document" tabindex="-1" aria-label="Document content"></article></main></div></body></html>`;
const style = `:root{font:16px/1.65 system-ui,sans-serif;color:#21312d;background:#fafbf9}*{box-sizing:border-box}body{margin:0}header{padding:1rem 1.5rem;border-bottom:1px solid #d8dfd9;display:flex;gap:1.5rem;align-items:center;background:#fff}header strong{font-size:1.35rem}header span,.source{color:#52665c;font-size:.85rem}.layout{display:grid;grid-template-columns:260px minmax(0,1fr);min-height:calc(100vh - 70px)}aside{padding:1.25rem;background:#f1f4ef;border-right:1px solid #d8dfd9}aside h2{font-size:.85rem;text-transform:uppercase;letter-spacing:.08em}nav ul{list-style:none;margin:0;padding:0}nav ul ul{padding-left:1rem}nav a,summary{display:block;padding:.3rem .5rem;overflow-wrap:anywhere}nav a{text-decoration:none;color:#294e41;border-radius:4px}summary{cursor:pointer}nav a:hover,nav a[aria-current=page]{background:#dce8dd}nav a[aria-current=page]{font-weight:700}main{padding:1.5rem clamp(1rem,4vw,4rem);min-width:0}article{max-width:850px;overflow-wrap:anywhere}article h1,article h2,article h3{line-height:1.25;scroll-margin-top:1rem}article h1{font-size:2rem}article a{color:#17624c}pre{background:#eaf0e9;padding:1rem;border-radius:5px;overflow:auto;font-size:.88rem}code{font-family:ui-monospace,monospace}table{display:block;overflow:auto;border-collapse:collapse}th,td{border:1px solid #cbd5cb;padding:.5rem .75rem;text-align:left}blockquote{border-left:3px solid #97ae9e;margin-left:0;padding-left:1rem;color:#52665c}:focus-visible{outline:2px solid #17624c;outline-offset:3px}.skip{position:absolute;left:1rem;top:-4rem;background:white;padding:.5rem}.skip:focus{top:.5rem}[aria-busy=true]{opacity:.6}#status{color:#52665c}#diagnostics{border-left:3px solid #9c6c19;padding:.25rem .75rem;background:#fff5dc;font-size:.9rem}#document-outline{max-width:850px;margin:.5rem 0 1.5rem}#outline a{display:block;padding:.15rem .5rem;overflow-wrap:anywhere}#outline .level-2{padding-left:1rem}#outline .level-3,#outline .level-4,#outline .level-5,#outline .level-6{padding-left:2rem}article :not(pre)>code{background:#eaf0e9;border-radius:3px;padding:.1em .25em}pre{max-width:100%;white-space:pre;tab-size:2}article table{max-width:100%}article h1,article h2,article h3{overflow-wrap:anywhere}article:focus:not(:focus-visible){outline:none}@media(max-width:680px){.layout{display:block}aside{border-right:0;border-bottom:1px solid #d8dfd9;max-height:35vh;overflow:auto}main{padding:1rem}header{padding:.8rem 1rem}}`;

/** Load only the compiled browser module packaged beside these assets, never project files. */
export async function loadViewerPresentation(): Promise<ViewerPresentation> {
  const script = await readFile(
    new URL("./client.js", import.meta.url),
    "utf8",
  );
  const navigationScript = await readFile(
    new URL("./navigation.js", import.meta.url),
    "utf8",
  );
  const searchScripts: Record<string, string> = {};
  for (const [route, path] of [
    ["/search-palette.js", "./search-palette.js"],
    ["/core/search-palette.js", "../core/search-palette.js"],
  ])
    searchScripts[route!] = await readFile(
      new URL(path!, import.meta.url),
      "utf8",
    );
  return {
    frontend: await loadFrontendPresentation(),
    page,
    style: style + searchStyle,
    script,
    navigationScript,
    searchScripts,
    renderMarkdown,
  };
}

const searchStyle = `[hidden]{display:none!important}button,input{font:inherit}button{cursor:pointer}#search-open{margin-left:auto;border:1px solid #b8cabc;background:#f1f4ef;border-radius:5px;padding:.35rem .7rem;color:#294e41}.search-overlay{position:fixed;inset:0;background:#172b245e;z-index:10;display:flex;justify-content:center;align-items:flex-start;padding:8vh 1rem;overflow:auto}.search-dialog{background:#fafbf9;box-shadow:0 10px 50px #152b2450;border:1px solid #97ae9e;border-radius:8px;width:min(720px,100%);padding:1.1rem;max-height:84vh;overflow:auto}.search-dialog label{display:block;font-weight:700}.search-dialog input{width:100%;padding:.6rem;border:1px solid #97ae9e;border-radius:4px;background:white;margin:.5rem 0}.search-chip{border:1px solid #97ae9e;border-radius:12px;background:#dce8dd;color:#294e41;padding:.15rem .7rem}.search-dialog ul{list-style:none;padding:0;margin:.5rem 0}.search-dialog [role=option] button{width:100%;text-align:left;border:0;background:transparent;padding:.6rem;border-radius:4px;overflow-wrap:anywhere}.search-dialog [role=option][aria-selected=true] button{background:#dce8dd}.search-dialog [role=option] span,.search-dialog [role=option] strong{display:block}.search-dialog [role=option] span{font-size:.85rem;color:#52665c}.search-help,.search-coverage{font-size:.8rem;color:#52665c}.search-dialog>button{margin-right:.5rem}`;
