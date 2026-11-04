import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** Reads the real theme tokens from globals.css and checks WCAG AA (4.5:1) for every text and background pair that is used. */
const css = readFileSync(new URL("../../src/app/globals.css", import.meta.url), "utf8");

function block(selector) {
  const start = css.indexOf(selector + " {");
  if (start < 0) throw new Error(`theme block not found: ${selector}`);
  return css.slice(start, css.indexOf("\n}", start));
}
function tokens(selector) {
  const out = {};
  for (const m of block(selector).matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const isHex = (v) => /^#[0-9a-f]{6}$/i.test(v ?? "");

// [text token, background token] pairs the UI really uses.
const PAIRS = [
  ["ink", "card"], ["text", "card"], ["muted", "card"], ["muted", "subtle"], ["muted", "subtle-2"],
  ["on-primary", "primary"], ["on-secondary", "secondary"],
  ["success", "success-soft"], ["warning", "warning-soft"], ["danger", "danger-soft"],
  ["on-accent-soft", "accent-soft"], ["nav-active-text", "nav-active-bg"],
  ["ink", "input-bg"], ["muted", "input-bg"], ["muted", "table-head-bg"],
];
// Themes whose page surface is a plain colour, where muted text can sit on it.
const SURFACE = { glass: "surface", pastel: "shell-bg", grove: "shell-bg" };

for (const theme of ["glass", "pastel", "grove"]) {
  describe(`${theme} theme contrast`, () => {
    const t = { ...tokens(":root,\n[data-theme=\"glass\"]"), ...(theme === "glass" ? {} : tokens(`[data-theme="${theme}"]`)) };
    const resolve = (name) => (name === "card" || name === "input" ? t[name] : t[name]);
    for (const [fg, bg] of PAIRS) {
      const f = resolve(fg);
      const b = resolve(bg);
      if (!isHex(f) || !isHex(b)) continue; // gradients, rgba and "transparent" are checked by eye
      it(`${fg} on ${bg} is at least 4.5:1`, () => {
        expect(ratio(f, b), `${f} on ${b}`).toBeGreaterThanOrEqual(4.5);
      });
    }
    it(`muted text is readable on the page surface`, () => {
      const f = t.muted;
      const b = t[SURFACE[theme]];
      if (isHex(b)) expect(ratio(f, b), `${f} on ${b}`).toBeGreaterThanOrEqual(4.5);
    });
  });
}
