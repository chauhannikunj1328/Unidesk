import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/** Guards for rules in CLAUDE.md, so they cannot quietly break again. */
const root = fileURLToPath(new URL("../../src/app", import.meta.url)); // decodes spaces in the folder name
const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const appFiles = walk(root).filter((f) => /\.(js|jsx)$/.test(f));

describe("CLAUDE.md rule 1: routes and pages never call prisma directly", () => {
  it("no file under src/app imports the raw Prisma client", () => {
    const offenders = appFiles.filter((f) => /@\/server\/prisma|server\/prisma\.js/.test(readFileSync(f, "utf8")));
    expect(offenders.map((f) => f.replace(root, ""))).toEqual([]);
  });
  it("no file under src/app calls prisma.<anything>", () => {
    const offenders = appFiles.filter((f) => /\bprisma\./.test(readFileSync(f, "utf8")));
    expect(offenders.map((f) => f.replace(root, ""))).toEqual([]);
  });
});

describe("CLAUDE.md: every list screen has loading and error states", () => {
  it("the Team list has loading.js and error.js", () => {
    for (const f of ["loading.js", "error.js"]) expect(existsSync(join(root, "(hub)/hub/team", f)), f).toBe(true);
  });
  it("the Hub has a fallback error page", () => {
    expect(existsSync(join(root, "(hub)/error.js"))).toBe(true);
  });
});
