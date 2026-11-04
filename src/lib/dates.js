/** One date format everywhere: "3 Nov 2026", times "9:40 AM ET". */

export function formatDate(date, timeZone = "America/New_York") {
  // Built from parts so the month is always three letters ("Sep", never "Sept") and the order is day month year.
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric", timeZone }).formatToParts(new Date(date)).map((p) => [p.type, p.value]));
  return `${parts.day} ${parts.month.slice(0, 3)} ${parts.year}`;
}

function timeZoneName(date, timeZone) {
  return new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" }).formatToParts(new Date(date)).find((p) => p.type === "timeZoneName")?.value ?? "";
}

export function formatTime(date, timeZone = "America/New_York", withZone = false) {
  const t = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone }).format(new Date(date));
  return withZone ? `${t} ${timeZoneName(date, timeZone)}` : t;
}

const dayKey = (d, tz) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(d));

/** "Today, 9:40 AM", "Yesterday", "3 days ago", "Last week", else "3 Nov 2026". */
export function formatRelative(date, now = new Date(), timeZone = "America/New_York") {
  if (!date) return "";
  const days = Math.round((Date.parse(dayKey(now, timeZone)) - Date.parse(dayKey(date, timeZone))) / 864e5);
  if (days <= 0) return `Today, ${formatTime(date, timeZone)}`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "Last week";
  return formatDate(date, timeZone);
}

/** "2 days ago" style for sent dates. */
export function daysAgo(date, now = new Date(), timeZone = "America/New_York") {
  const days = Math.round((Date.parse(dayKey(now, timeZone)) - Date.parse(dayKey(date, timeZone))) / 864e5);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}
