import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Renders the CampusFind Markdown manual to print-ready HTML and PDF.
 * Chrome/Edge is used as the PDF engine; no additional npm dependency is needed.
 */

const projectRoot = resolve(import.meta.dirname, '..');
const markdownPath = resolve(
  projectRoot,
  process.argv[2] ?? 'docs/CAMPUSFIND_DOCUMENTATION.md',
);
const htmlPath = resolve(projectRoot, process.argv[3] ?? 'docs/CAMPUSFIND_DOCUMENTATION.html');
const pdfPath = resolve(projectRoot, process.argv[4] ?? 'docs/CAMPUSFIND_DOCUMENTATION.pdf');

const BROWSER_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function inline(value) {
  let text = escapeHtml(value);
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return text;
}

function renderTable(rows) {
  const body = rows.filter((row, index) => {
    if (index === 1) return !/^\s*\|?[\s:|-]+\|?\s*$/.test(row);
    return true;
  });
  const cells = body.map((row) =>
    row
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => inline(cell.trim())),
  );
  if (cells.length === 0) return '';
  const [head, ...rest] = cells;
  const headHtml = head.map((cell) => `<th>${cell}</th>`).join('');
  const bodyHtml = rest
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
    .join('\n');
  return `<table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const output = [];
  let paragraph = [];
  let list = null;
  let table = [];
  let code = null;
  let language = '';
  let quote = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    output.push(`<p>${inline(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    output.push(`<${list.tag}>${list.items.map((item) => `<li>${inline(item)}</li>`).join('')}</${list.tag}>`);
    list = null;
  };
  const flushTable = () => {
    if (table.length === 0) return;
    output.push(renderTable(table));
    table = [];
  };
  const flushQuote = () => {
    if (quote.length === 0) return;
    output.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`);
    quote = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushTable();
    flushQuote();
  };

  for (const line of lines) {
    if (code) {
      if (/^```/.test(line.trim())) {
        output.push(`<pre><code class="language-${escapeHtml(language)}">${escapeHtml(code.join('\n'))}</code></pre>`);
        code = null;
        language = '';
      } else {
        code.push(line);
      }
      continue;
    }

    if (/^```/.test(line.trim())) {
      flushAll();
      code = [];
      language = line.trim().slice(3).trim();
      continue;
    }

    if (!line.trim()) {
      flushAll();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushAll();
      const level = heading[1].length;
      const title = heading[2].trim();
      output.push(`<h${level} id="${slugify(title)}">${inline(title)}</h${level}>`);
      continue;
    }

    if (/^\s*(?:-{3,}|\*{3,})\s*$/.test(line)) {
      flushAll();
      output.push('<hr>');
      continue;
    }

    if (line.trim().startsWith('|')) {
      flushParagraph();
      flushList();
      flushQuote();
      table.push(line);
      continue;
    }

    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      flushTable();
      quote.push(quoteMatch[1]);
      continue;
    }

    const listMatch = line.match(/^\s*(?:[-*+]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      flushParagraph();
      flushTable();
      flushQuote();
      const tag = /^\s*\d+\./.test(line) ? 'ol' : 'ul';
      if (!list || list.tag !== tag) {
        flushList();
        list = { tag, items: [] };
      }
      list.items.push(listMatch[1]);
      continue;
    }

    flushList();
    flushTable();
    flushQuote();
    paragraph.push(line.trim());
  }

  if (code) {
    output.push(`<pre><code class="language-${escapeHtml(language)}">${escapeHtml(code.join('\n'))}</code></pre>`);
  }
  flushAll();
  return output.join('\n');
}

const markdown = readFileSync(markdownPath, 'utf8');
const body = markdownToHtml(markdown);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CampusFind Complete Documentation</title>
<style>
@page { size: A4; margin: 18mm 15mm 18mm 15mm; }
* { box-sizing: border-box; }
html { font-family: "Segoe UI", Arial, sans-serif; font-size: 10.5pt; color: #1b1b1b; }
body { margin: 0; }
h1 { font-size: 27pt; line-height: 1.15; color: #0b3558; margin: 0 0 14pt; padding-bottom: 10pt; border-bottom: 5px solid #ff4500; }
h2 { font-size: 17pt; color: #0b3558; margin: 0 0 10pt; padding-bottom: 5pt; border-bottom: 1px solid #cfd8de; break-before: page; }
h2:first-of-type { break-before: auto; }
h3 { font-size: 13pt; color: #005b9a; margin: 15pt 0 5pt; }
h4 { font-size: 11pt; color: #0b3558; margin: 11pt 0 4pt; }
p { margin: 0 0 8pt; line-height: 1.45; }
ul, ol { margin: 0 0 9pt 18pt; padding: 0; }
li { margin: 0 0 3pt; line-height: 1.4; }
hr { border: 0; border-top: 1px solid #d8dde1; margin: 14pt 0; }
a { color: #005b9a; text-decoration: none; }
strong { color: #0b3558; }
code { font-family: Consolas, "Courier New", monospace; background: #eef1f3; padding: 0 2pt; font-size: 9pt; }
pre { background: #f5f6f7; border-left: 4px solid #ff4500; padding: 8pt 10pt; margin: 8pt 0 12pt; white-space: pre-wrap; word-break: break-word; font-size: 8.5pt; line-height: 1.35; }
pre code { background: transparent; padding: 0; font-size: inherit; }
blockquote { border-left: 4px solid #ffbe00; background: #fff9e8; padding: 6pt 10pt; margin: 8pt 0 12pt; color: #4a3b12; }
blockquote p { margin: 0; }
table { width: 100%; border-collapse: collapse; margin: 8pt 0 12pt; font-size: 8.8pt; }
th, td { border: 1px solid #d4dade; padding: 5pt 6pt; text-align: left; vertical-align: top; }
th { background: #eaf1f6; color: #0b3558; font-weight: 700; }
tr, pre, blockquote { break-inside: avoid; }
h1, h2, h3, h4 { break-after: avoid; }
.doc-footer { margin-top: 22pt; padding-top: 8pt; border-top: 1px solid #d8dde1; color: #6b7378; font-size: 8.5pt; }
</style>
</head>
<body>
${body}
<div class="doc-footer">CampusFind complete documentation — generated from the repository Markdown source.</div>
</body>
</html>`;

mkdirSync(dirname(htmlPath), { recursive: true });
mkdirSync(dirname(pdfPath), { recursive: true });
writeFileSync(htmlPath, html, 'utf8');

const browser = BROWSER_CANDIDATES.find((candidate) => existsSync(candidate));
if (!browser) {
  console.error('Chrome or Edge was not found; HTML was generated but PDF was not.');
  process.exit(1);
}

const fileUrl = `file:///${htmlPath.replaceAll('\\', '/').replace(/^\/+/, '')}`;
const result = spawnSync(
  browser,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--no-pdf-header-footer',
    `--print-to-pdf=${pdfPath}`,
    fileUrl,
  ],
  { cwd: projectRoot, encoding: 'utf8', timeout: 180_000 },
);

if (!existsSync(pdfPath)) {
  console.error(result.stdout || '');
  console.error(result.stderr || '');
  console.error('PDF was not created.');
  process.exit(1);
}

console.log(`Markdown: ${markdownPath}`);
console.log(`HTML:     ${htmlPath}`);
console.log(`PDF:      ${pdfPath}`);
