// Builds the v0.3 dark brand board SVG, reusing the EXACT clover/symbol
// path geometry from v0.2's generate_assets.py (same coordinates, same
// leaf path, same node layout) — only the surrounding theme colors and
// added JetBrains Mono numeric sample are new. No logo geometry is redrawn.
import { writeFileSync } from "node:fs";

const C = {
  ink: "#101729",
  ink2: "#1D2740",
  inkElevated: "#232F4D",
  violet: "#6D3CFF",
  violet2: "#8B5CFF",
  actionText: "#A07AFF",
  blue: "#1677FF",
  teal: "#12C7B0",
  green: "#22B96B",
  green2: "#66D889",
  white: "#FFFFFF",
  mist: "#B7C0D6",
  border: "#2C3856",
};

function defs() {
  return `<defs>
    <linearGradient id="atlasGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${C.violet}"/>
      <stop offset="52%" stop-color="${C.blue}"/>
      <stop offset="100%" stop-color="${C.teal}"/>
    </linearGradient>
    <linearGradient id="atlasGrad2" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${C.violet2}"/>
      <stop offset="100%" stop-color="${C.violet}"/>
    </linearGradient>
    <linearGradient id="cloverGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${C.green2}"/>
      <stop offset="100%" stop-color="${C.green}"/>
    </linearGradient>
  </defs>`;
}

// Identical to v0.2's clover(): four leaves rotated around one shared
// origin, so the optical center never drifts. Geometry unchanged.
function clover(cx = 200, cy = 162, scale = 1.0, fill = "url(#cloverGrad)") {
  const leaf = "M 0 0 C -10 -12 -38 -32 -38 -56 C -38 -82 -8 -92 0 -68 C 8 -92 38 -82 38 -56 C 38 -32 10 -12 0 0 Z";
  const parts = [];
  for (const angle of [0, 90, 180, 270]) {
    parts.push(`<path d="${leaf}" transform="translate(${cx},${cy}) rotate(${angle}) scale(${scale})" fill="${fill}"/>`);
  }
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${7 * scale}" fill="${fill}"/>`);
  return parts.join("");
}

// Identical to v0.2's symbol_svg() node/edge layout.
function symbolInner() {
  const stroke = "url(#atlasGrad)";
  const nodes = [C.violet2, C.blue, C.teal, C.violet, C.teal, C.blue];
  const coords = [
    [200, 46],
    [114, 132],
    [286, 132],
    [63, 265],
    [200, 265],
    [337, 265],
  ];
  const edges = [
    [0, 1],
    [0, 2],
    [1, 2],
    [1, 3],
    [1, 4],
    [2, 4],
    [2, 5],
  ];
  const lines = edges.map(([a, b]) => `<line x1="${coords[a][0]}" y1="${coords[a][1]}" x2="${coords[b][0]}" y2="${coords[b][1]}" stroke="${stroke}" stroke-width="15" stroke-linecap="round"/>`).join("");
  const circles = coords.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="27" fill="${nodes[i]}" stroke="${C.white}" stroke-opacity="0.10" stroke-width="2"/>`).join("");
  return `${lines}${circles}${clover(200, 165, 0.58, "url(#cloverGrad)")}`;
}

const symbolInnerMarkup = symbolInner();

const board = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
${defs()}
<rect width="1920" height="1080" fill="${C.ink}"/>
<text x="100" y="90" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="600" letter-spacing="4" fill="${C.mist}">LOTOATLAS / BRAND BOARD v0.3 — DARK FIRST</text>

<!-- Stacked logo, unchanged geometry, reversed (white wordmark) for dark bg.
     Bounding box before transform: symbol ~(160,28)-(560,358); wordmark text
     baseline at y=545/610. Scaled 0.42 and translated so the whole block
     stays within y:150-420, clear of the palette/typography sections below. -->
<g transform="translate(120,150) scale(0.42)">
  <g transform="translate(160,28)">${symbolInnerMarkup}</g>
  <text x="360" y="545" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="95" font-weight="800" letter-spacing="-4" fill="${C.white}">Loto<tspan fill="url(#atlasGrad2)">Atlas</tspan></text>
  <text x="360" y="610" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="600" letter-spacing="7" fill="${C.mist}">ORGANIZE. ANALISE. CONFIRA.</text>
</g>
<text x="80" y="450" font-family="Inter, Arial, sans-serif" font-size="18" fill="${C.mist}">Estratégia + sorte, com clareza e controle.</text>

<!-- Surface hierarchy demo: bg-primary (this whole board) -> bg-surface -> bg-surface-elevated -->
<rect x="560" y="120" width="620" height="230" rx="24" fill="${C.ink2}" stroke="${C.border}"/>
<text x="590" y="165" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700" fill="${C.mist}">--la-bg-surface (Atlas Ink 2)</text>
<rect x="590" y="185" width="560" height="130" rx="16" fill="${C.inkElevated}"/>
<text x="615" y="220" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="700" fill="${C.mist}">--la-bg-surface-elevated</text>
<text x="615" y="255" font-family="Inter, Arial, sans-serif" font-size="18" fill="${C.white}">Modal / pop-over / menu</text>

<!-- One functional action color -->
<rect x="1220" y="120" width="620" height="230" rx="24" fill="${C.ink2}" stroke="${C.border}"/>
<text x="1250" y="165" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700" fill="${C.mist}">Uma cor de ação: Atlas Violet</text>
<rect x="1250" y="190" width="230" height="60" rx="12" fill="${C.violet}"/>
<text x="1365" y="228" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700" fill="${C.white}">Gerar jogos</text>
<text x="1250" y="300" font-family="Inter, Arial, sans-serif" font-size="20" fill="${C.actionText}" text-decoration="underline">Ver detalhes (--la-action-text · 5.71:1)</text>

<!-- Palette strip -->
<text x="80" y="530" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="700" fill="${C.white}">PALETA</text>
<g transform="translate(80,560)">
  <circle cx="35" cy="35" r="35" fill="${C.ink}" stroke="${C.border}"/>
  <circle cx="135" cy="35" r="35" fill="${C.violet}"/>
  <circle cx="235" cy="35" r="35" fill="${C.blue}"/>
  <circle cx="335" cy="35" r="35" fill="${C.teal}"/>
  <circle cx="435" cy="35" r="35" fill="${C.green}"/>
</g>
<text x="80" y="680" font-family="Inter, Arial, sans-serif" font-size="16" fill="${C.mist}">Ink · Violet (ação) · Blue (dado) · Teal (dado) · Luck Green (sucesso factual)</text>

<!-- Typography sample -->
<text x="80" y="730" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="700" fill="${C.white}">TIPOGRAFIA</text>
<text x="80" y="780" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="700" fill="${C.white}">Inter — títulos, botões, navegação</text>
<text x="80" y="818" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="400" fill="${C.mist}">Texto de corpo em Inter Regular, com texto secundário em Atlas Mist.</text>
<text x="80" y="878" font-family="'JetBrains Mono', 'Courier New', monospace" font-size="30" font-weight="600" fill="${C.white}">01 · 11 · 36 · 43 · 48 · 49</text>
<text x="80" y="912" font-family="Inter, Arial, sans-serif" font-size="16" fill="${C.mist}">JetBrains Mono — dezenas, concursos, timestamps, valores (nunca títulos/botões)</text>

<!-- Success state -->
<rect x="80" y="950" width="480" height="90" rx="16" fill="${C.ink2}" stroke="${C.border}"/>
<circle cx="125" cy="995" r="12" fill="${C.green}"/>
<text x="155" y="1002" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="600" fill="${C.white}">Jogos salvos com sucesso</text>
<text x="620" y="990" font-family="Inter, Arial, sans-serif" font-size="15" fill="${C.mist}">Luck Green = confirmação factual — nunca sugere prêmio ou vitória.</text>
</svg>`;

writeFileSync(process.argv[2], board, "utf-8");
console.log("wrote", process.argv[2]);
