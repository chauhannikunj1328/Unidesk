/** Money is stored as whole cents. These helpers convert for display and input only. */

/** @param {number} cents @param {string} [currency] */
export function formatMoney(cents, currency = "USD") {
  if (!Number.isInteger(cents)) throw new Error("formatMoney expects whole cents");
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

/** "12.34" or "$1,234.50" to cents. Returns null when the text is not a valid amount. */
export function parseMoney(text) {
  const cleaned = String(text).replace(/[$,\s]/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.replace("-", "").split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return cleaned.startsWith("-") ? -cents : cents;
}
