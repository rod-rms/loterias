import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const [, , mdPath, outPath, darkBoardPath, logoPath] = process.argv;
const md = readFileSync(mdPath, "utf-8");
const lines = md.split(/\r?\n/);

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function inline(text) {
  return esc(text).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>");
}

let html = "";
let i = 0;
let inList = false;
function closeList() {
  if (inList) {
    html += "</ul>";
    inList = false;
  }
}
while (i < lines.length) {
  const line = lines[i];
  if (line.trim() === "") {
    closeList();
    i++;
    continue;
  }
  if (line.trim() === "---") {
    closeList();
    html += '<div class="pagebreak"></div>';
    i++;
    continue;
  }
  if (line.startsWith("### ")) {
    closeList();
    html += `<h3>${inline(line.slice(4))}</h3>`;
    i++;
    continue;
  }
  if (line.startsWith("## ")) {
    closeList();
    html += `<h2>${inline(line.slice(3))}</h2>`;
    i++;
    continue;
  }
  if (line.startsWith("# ")) {
    closeList();
    html += `<h1>${inline(line.slice(2))}</h1>`;
    i++;
    continue;
  }
  if (line.trim().startsWith("|")) {
    closeList();
    const block = [];
    while (i < lines.length && lines[i].trim().startsWith("|")) {
      block.push(lines[i]);
      i++;
    }
    const rows = block.filter((l) => !/^\|[\s-:|]+\|$/.test(l.trim())).map((l) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()));
    html += "<table>";
    rows.forEach((cells, ri) => {
      const tag = ri === 0 ? "th" : "td";
      html += `<tr>${cells.map((c) => `<${tag}>${inline(c)}</${tag}>`).join("")}</tr>`;
    });
    html += "</table>";
    continue;
  }
  if (/^[-*] /.test(line.trim())) {
    if (!inList) {
      html += "<ul>";
      inList = true;
    }
    html += `<li>${inline(line.trim().slice(2))}</li>`;
    i++;
    continue;
  }
  closeList();
  html += `<p>${inline(line)}</p>`;
  i++;
}
closeList();

const logoDataUri = `data:image/png;base64,${readFileSync(logoPath).toString("base64")}`;
const boardDataUri = `data:image/png;base64,${readFileSync(darkBoardPath).toString("base64")}`;

const fullHtml = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 24mm 20mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #101729; font-size: 11pt; line-height: 1.5; }
  .cover { page-break-after: always; text-align: center; background: #101729; color: #fff; margin: -24mm -20mm; padding: 40mm 20mm; height: 249mm; box-sizing: border-box; }
  .cover img.logo { width: 120px; margin-bottom: 24px; }
  .cover h1 { font-size: 28pt; margin: 0 0 8px; color: #fff; border: none; padding: 0; }
  .cover p { color: #B7C0D6; }
  .cover img.board { width: 100%; max-width: 600px; margin-top: 40px; border-radius: 8px; }
  h1 { color: #101729; border-bottom: 3px solid #6D3CFF; padding-bottom: 6px; margin-top: 26pt; font-size: 18pt; }
  h2 { color: #1D2740; margin-top: 18pt; font-size: 14pt; }
  h3 { color: #1D2740; margin-top: 12pt; font-size: 12pt; }
  table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 9.5pt; }
  th, td { border: 1px solid #DDE3EC; padding: 4px 8px; text-align: left; }
  th { background: #1D2740; color: #fff; }
  code { background: #F7F9FC; padding: 1px 4px; border-radius: 3px; font-family: "Courier New", monospace; }
  ul { margin: 6px 0; padding-left: 20px; }
  .pagebreak { page-break-after: always; }
  strong { color: #101729; }
</style>
</head>
<body>
  <div class="cover">
    <img class="logo" src="${logoDataUri}" alt="LotoAtlas">
    <h1>LotoAtlas — Brandbook</h1>
    <p>v0.3 — Dark First<br>(baseado na v0.2 aprovada e geometricamente corrigida)</p>
    <img class="board" src="${boardDataUri}" alt="Brand board dark">
  </div>
  ${html}
</body>
</html>`;

const tmpHtmlPath = path.join(path.dirname(outPath), "_tmp_brandbook.html");
writeFileSync(tmpHtmlPath, fullHtml, "utf-8");

const browser = await chromium.launch();
const page = await browser.newPage();
const absHtmlPath = path.resolve(tmpHtmlPath).replace(/\\/g, "/");
await page.goto("file:///" + absHtmlPath);
await page.pdf({ path: outPath, format: "A4", printBackground: true, margin: { top: "24mm", bottom: "20mm", left: "20mm", right: "20mm" } });
await browser.close();
console.log("wrote", outPath);
