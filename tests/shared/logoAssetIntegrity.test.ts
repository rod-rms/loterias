import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const BRAND_KIT_SVG_DIR = path.join(process.cwd(), "docs/global/LotoAtlas_BrandKit_v0.3/logos/svg");
const APP_ASSET_FILES = [
  "src/assets/brand/lotoatlas-logo-horizontal-reversed.svg",
  "src/assets/brand/lotoatlas-symbol-color.svg",
  "src/assets/brand/lotoatlas-symbol-on-dark.svg",
];
const PUBLIC_FAVICON_FILES = ["public/brand/lotoatlas-favicon.svg", "public/brand/lotoatlas-app-icon.svg"];

/**
 * A previous Brand Kit iteration shipped a visibly misaligned clover; the
 * v0.2/v0.3 geometry fix must never regress by the app quietly using a
 * hand-edited or re-exported copy of the logo instead of the approved
 * source asset. Byte-for-byte identity is the strongest guarantee available
 * without a visual-snapshot testing setup (none exists in this repo yet).
 */
describe("LotoAtlas logo assets — byte-identical to the approved Brand Kit v0.3 source", () => {
  it.each([...APP_ASSET_FILES, ...PUBLIC_FAVICON_FILES])("%s matches its Brand Kit v0.3 source exactly", (relativePath) => {
    const appPath = path.join(process.cwd(), relativePath);
    expect(existsSync(appPath), `missing app asset: ${relativePath}`).toBe(true);
    const appContent = readFileSync(appPath, "utf8");

    const basename = path.basename(relativePath);
    const sourcePath = path.join(BRAND_KIT_SVG_DIR, basename);
    expect(existsSync(sourcePath), `no matching Brand Kit v0.3 source for ${basename}`).toBe(true);
    const sourceContent = readFileSync(sourcePath, "utf8");

    expect(appContent).toBe(sourceContent);
  });

  it("does not use any LotoAtlas_BrandKit_v0.1 or v0.2 asset in the application source or public assets", () => {
    for (const relativePath of [...APP_ASSET_FILES, ...PUBLIC_FAVICON_FILES]) {
      const content = readFileSync(path.join(process.cwd(), relativePath), "utf8");
      expect(content).not.toMatch(/BrandKit_v0\.1|BrandKit_v0\.2/);
    }
  });

  it("the SVG viewBox aspect ratios used in the header are not distorted by mismatched width/height hints in AppShell", () => {
    const appShell = readFileSync(path.join(process.cwd(), "src/app/layout/AppShell.tsx"), "utf8");

    const horizontalSvg = readFileSync(path.join(process.cwd(), APP_ASSET_FILES[0]), "utf8");
    const horizontalViewBox = horizontalSvg.match(/viewBox="0 0 (\d+) (\d+)"/);
    expect(horizontalViewBox).not.toBeNull();
    const horizontalRatio = Number(horizontalViewBox![1]) / Number(horizontalViewBox![2]);

    const symbolSvg = readFileSync(path.join(process.cwd(), APP_ASSET_FILES[2]), "utf8");
    const symbolViewBox = symbolSvg.match(/viewBox="0 0 (\d+) (\d+)"/);
    expect(symbolViewBox).not.toBeNull();
    const symbolRatio = Number(symbolViewBox![1]) / Number(symbolViewBox![2]);

    const widthHeightPairs = [...appShell.matchAll(/width=\{(\d+)\}\s+height=\{(\d+)\}/g)].map(([, w, h]) => Number(w) / Number(h));
    expect(widthHeightPairs.length).toBeGreaterThanOrEqual(2);

    const matchesEitherRatio = (r: number) => Math.abs(r - horizontalRatio) < 0.05 || Math.abs(r - symbolRatio) < 0.05;
    for (const ratio of widthHeightPairs) {
      expect(matchesEitherRatio(ratio)).toBe(true);
    }
  });
});
