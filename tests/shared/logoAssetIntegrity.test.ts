import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const BRAND_KIT_SVG_DIR = path.join(process.cwd(), "docs/global/LotoAtlas_BrandKit_v1/01_SVG");

// Brand Kit v1 (new identity, docs/global/LotoAtlas_BrandKit_v1). The app chrome uses the compact reversed lockup and
// the ready-made on-dark symbol (which carries its own Navy Dark tile by design); the public favicon/app icon are the
// kit's own files.
const LOCKUP_FILE = "src/assets/brand/lotoatlas-logo-compact-reversed.svg"; // transparent, tagline-free
const SYMBOL_FILE = "src/assets/brand/lotoatlas-symbol-on-dark.svg"; // opaque Navy Dark tile
const PUBLIC_FILES = ["public/brand/lotoatlas-favicon.svg", "public/brand/lotoatlas-app-icon.svg"];
const ALL_ASSET_FILES = [LOCKUP_FILE, SYMBOL_FILE, ...PUBLIC_FILES];

/**
 * The app must keep using the approved source assets byte-for-byte, never a hand-edited or re-exported copy.
 * Byte-for-byte identity is the strongest guarantee available without a visual-snapshot setup.
 */
describe("LotoAtlas logo assets — byte-identical to the approved Brand Kit v1 source", () => {
  it.each(ALL_ASSET_FILES)("%s matches its Brand Kit v1 source exactly", (relativePath) => {
    const appPath = path.join(process.cwd(), relativePath);
    expect(existsSync(appPath), `missing app asset: ${relativePath}`).toBe(true);
    const sourcePath = path.join(BRAND_KIT_SVG_DIR, path.basename(relativePath));
    expect(existsSync(sourcePath), `no matching Brand Kit v1 source for ${path.basename(relativePath)}`).toBe(true);
    expect(readFileSync(appPath, "utf8")).toBe(readFileSync(sourcePath, "utf8"));
  });

  it("does not reference any older Brand Kit (v0.x) asset or the old clover mark", () => {
    for (const relativePath of ALL_ASSET_FILES) {
      const content = readFileSync(path.join(process.cwd(), relativePath), "utf8");
      expect(content).not.toMatch(/BrandKit_v0\./);
      expect(content).not.toMatch(/cloverGrad/);
    }
  });

  it("the header lockup is transparent (no full-canvas background rect) and tagline-free", () => {
    const content = readFileSync(path.join(process.cwd(), LOCKUP_FILE), "utf8");
    expect(content, "lockup must not bake in a background rect").not.toMatch(/<rect[^>]*width="100%"/);
    expect(content, "lockup must not embed the tagline").not.toMatch(/ORGANIZE\. ANALISE\. CONFIRA\./);
  });

  it("the favicon files referenced by index.html exist", () => {
    const html = readFileSync(path.join(process.cwd(), "index.html"), "utf8");
    for (const href of [...html.matchAll(/href="(\/brand\/[^"]+)"/g)].map((m) => m[1]!)) {
      expect(existsSync(path.join(process.cwd(), "public", href)), `missing ${href}`).toBe(true);
    }
  });

  it("AppShell uses the Brand Kit v1 compact lockup and on-dark symbol, and none of the old assets", () => {
    const appShell = readFileSync(path.join(process.cwd(), "src/app/layout/AppShell.tsx"), "utf8");
    expect(appShell).toMatch(/lotoatlas-logo-compact-reversed\.svg/);
    expect(appShell).toMatch(/lotoatlas-symbol-on-dark\.svg/);
    expect(appShell).not.toMatch(/lotoatlas-logo-ui-reversed\.svg|lotoatlas-symbol-ui-on-dark\.svg|lotoatlas-logo-horizontal-reversed\.svg/);
  });

  it("the width/height hints in AppShell match the SVG viewBox aspect ratios (no distortion)", () => {
    const appShell = readFileSync(path.join(process.cwd(), "src/app/layout/AppShell.tsx"), "utf8");
    const ratio = (file: string) => {
      const m = readFileSync(path.join(process.cwd(), file), "utf8").match(/viewBox="[\d.-]+ [\d.-]+ ([\d.]+) ([\d.]+)"/);
      expect(m, `viewBox in ${file}`).not.toBeNull();
      return Number(m![1]) / Number(m![2]);
    };
    const lockupRatio = ratio(LOCKUP_FILE);
    const symbolRatio = ratio(SYMBOL_FILE);
    const pairs = [...appShell.matchAll(/width=\{(\d+)\}\s+height=\{(\d+)\}/g)].map(([, w, h]) => Number(w) / Number(h));
    expect(pairs.length).toBeGreaterThanOrEqual(2);
    for (const r of pairs) expect(Math.abs(r - lockupRatio) < 0.05 || Math.abs(r - symbolRatio) < 0.15).toBe(true);
  });

  it("the Brand Kit v1 source folder is tracked in the repository", () => {
    for (const f of ["README.md", "01_SVG/lotoatlas-logo-compact-reversed.svg", "01_SVG/lotoatlas-symbol-on-dark.svg", "03_Web/favicon.ico"]) {
      expect(existsSync(path.join(process.cwd(), "docs/global/LotoAtlas_BrandKit_v1", f)), f).toBe(true);
    }
  });
});
