import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const html = readFileSync(path.join(process.cwd(), "index.html"), "utf8");

describe("index.html — LotoAtlas brand metadata (Brand Kit v0.3)", () => {
  it("titles the app LotoAtlas, not the old 'Loterias' self-reference", () => {
    expect(html).toMatch(/<title>LotoAtlas\b/);
  });

  it("describes the app as LotoAtlas in the meta description, without prediction/guarantee claims", () => {
    const match = html.match(/<meta\s+name="description"\s+content="([^"]*)"/);
    expect(match).not.toBeNull();
    const description = match![1];
    expect(description).toMatch(/^LotoAtlas/);
    expect(description.toLowerCase()).toMatch(/não é previsão de sorteios/);
    expect(description.toLowerCase()).not.toMatch(/garant|melhor(e|a)s? suas chances|aumenta suas chances|número(s)? sorteado/);
  });

  it("opens in dark mode by default via data-theme, with a matching color-scheme", () => {
    expect(html).toMatch(/<html[^>]*data-theme="dark"/);
    expect(html).toMatch(/<meta\s+name="color-scheme"\s+content="dark"/);
    expect(html).toMatch(/<meta\s+name="theme-color"\s+content="#101729"/);
  });

  it("references the approved LotoAtlas Brand Kit v0.3 favicon assets, and every referenced file exists", () => {
    const hrefs = [...html.matchAll(/href="(\/brand\/[^"]+)"/g)].map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      const filePath = path.join(process.cwd(), "public", href);
      expect(existsSync(filePath), `missing favicon asset referenced by index.html: ${href}`).toBe(true);
    }
  });
});
