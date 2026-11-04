/** How long after the last keystroke an incoming URL change is treated as an echo of what was just typed. */
export const ECHO_WINDOW_MS = 1200;

/**
 * Should a search box take its text from the URL? Not while the person is still typing: the URL catches up a moment
 * after the debounce fires, and applying it then would erase letters typed in between.
 * @param {number} lastKeyAt  time of the last keystroke (ms), 0 if none
 */
export const shouldTakeFromUrl = (lastKeyAt, now = Date.now()) => now - lastKeyAt >= ECHO_WINDOW_MS;
