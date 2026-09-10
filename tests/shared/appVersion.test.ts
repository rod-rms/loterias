import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { APP_VERSION } from "../../src/shared/lib/appVersion";

describe("app version — single source of truth", () => {
  it("package.json version is 1.1.2", () => {
    const pkg = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
    expect(pkg.version).toBe("1.1.2");
  });

  it("the visible app version comes from the build constant, matching package.json", () => {
    const pkg = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
    expect(APP_VERSION).toBe(pkg.version);
  });

  it("no component hard-codes a 'v1.1.2' literal instead of using APP_VERSION", () => {
    const appDir = path.join(process.cwd(), "src/app");
    const offenders: string[] = [];
    function walk(dir: string) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry.name)) {
          const content = readFileSync(full, "utf8");
          if (/v1\.1\.2/.test(content)) offenders.push(full);
        }
      }
    }
    walk(appDir);
    expect(offenders).toEqual([]);
  });
});
