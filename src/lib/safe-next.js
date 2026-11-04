/**
 * Where to go after sign-in. Only same-site relative paths are honoured; anything else goes to the default.
 * Blocks "//evil.com", "/\evil.com", "https://evil.com" and "javascript:" style values.
 */
export function safeNext(next, fallback = "/hub") {
  if (typeof next !== "string" || next.length === 0 || next.length > 500) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  // Never bounce back into the auth pages.
  if (/^\/hub\/(sign-in|sign-up|verify-email|forgot-password|reset-password)/.test(next)) return fallback;
  return next;
}
