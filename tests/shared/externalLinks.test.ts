import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RESPONSIBLE_GAMING_URL } from "../../src/shared/lib/externalLinks";

const OBSOLETE_URL = "https://loterias.caixa.gov.br/Paginas/jogo-responsavel.aspx";

function listFilesRecursive(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFilesRecursive(full) : [full];
  });
}

describe("responsible gaming URL", () => {
  it("points to the current official CAIXA page", () => {
    expect(RESPONSIBLE_GAMING_URL).toBe("https://www.caixa.gov.br/jogo-responsavel/Paginas/default.aspx");
  });

  it("the obsolete URL is not referenced anywhere in the ResponsibleGamingNotice component source", () => {
    const source = readFileSync(path.join(process.cwd(), "src/shared/components/ResponsibleGamingNotice.tsx"), "utf8");
    expect(source).not.toContain(OBSOLETE_URL);
    expect(source).toContain("RESPONSIBLE_GAMING_URL");
  });

  it("the obsolete URL is not present in the production bundle (dist/), when built", () => {
    const distDir = path.join(process.cwd(), "dist", "assets");
    if (!existsSync(distDir)) return; // build artifact not present in this run; covered by CI's build step instead.
    const offenders = listFilesRecursive(distDir).filter((f) => /\.(js|css|html)$/.test(f) && readFileSync(f, "utf8").includes(OBSOLETE_URL));
    expect(offenders).toEqual([]);
  });
});
