/**
 * WORKING DAYS, SYDNEY TIME.
 *
 * The chase emails count in business days and go out at half past nine in
 * the morning. Both of those are harder than they look from Vercel, which
 * runs in UTC and does not know about Australian daylight saving or the
 * Queen's Birthday.
 *
 * No new dependency. `Intl` already knows what time it is in Sydney, and the
 * holidays are a list somebody tops up once a year, which is less to go
 * wrong than an API that can be down inside a cron run.
 */

const ZONE = "Australia/Sydney";

/**
 * NSW public holidays, from NSW Industrial Relations.
 *
 * TOP THIS UP EACH DECEMBER. When it runs out the code does not stop, it
 * logs loudly and treats every weekday as a working day. A chase landing on
 * a public holiday is rude. A sequence silently stalling for a year is
 * worse, because nobody would notice.
 */
export const NSW_PUBLIC_HOLIDAYS: readonly string[] = [
  // 2026
  "2026-01-01", "2026-01-26", "2026-04-03", "2026-04-04", "2026-04-05",
  "2026-04-06", "2026-04-25", "2026-06-08", "2026-10-05", "2026-12-25",
  "2026-12-26", "2026-12-28",
  // 2027
  "2027-01-01", "2027-01-26", "2027-03-26", "2027-03-27", "2027-03-28",
  "2027-03-29", "2027-04-25", "2027-04-26", "2027-06-14", "2027-10-04",
  "2027-12-25", "2027-12-27", "2027-12-28",
];

const HOLIDAYS = new Set(NSW_PUBLIC_HOLIDAYS);

/** The last date the holiday list actually covers. */
const HOLIDAYS_GOOD_UNTIL = NSW_PUBLIC_HOLIDAYS.reduce(
  (a, b) => (b > a ? b : a),
  "",
);

const PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  weekday: "short",
});

interface SydneyParts {
  date: string;
  hour: number;
  minute: number;
  weekday: string;
}

/** What the clock on a Sydney wall says at this instant. */
export function sydneyParts(at: Date): SydneyParts {
  const p = Object.fromEntries(
    PARTS.formatToParts(at).map((x) => [x.type, x.value]),
  ) as Record<string, string>;
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    // Midnight comes back as "24" in some runtimes, which would read as the
    // next day and push a send a day late.
    hour: Number(p.hour) % 24,
    minute: Number(p.minute),
    weekday: p.weekday,
  };
}

export function isBusinessDay(isoDate: string): boolean {
  const [y, m, d] = isoDate.split("-").map(Number);
  // Midday UTC, so no time zone can nudge it into a different date.
  const day = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  if (day === 0 || day === 6) return false;
  if (isoDate > HOLIDAYS_GOOD_UNTIL) {
    console.warn(
      `[business-days] the NSW holiday list stops at ${HOLIDAYS_GOOD_UNTIL}. ` +
        `${isoDate} is past it and is being treated as a working day. ` +
        `Top up NSW_PUBLIC_HOLIDAYS.`,
    );
    return true;
  }
  return !HOLIDAYS.has(isoDate);
}

function shiftDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, 12));
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
}

/** The next working day strictly after this one. */
export function nextBusinessDay(isoDate: string): string {
  let d = shiftDate(isoDate, 1);
  for (let i = 0; i < 40 && !isBusinessDay(d); i++) d = shiftDate(d, 1);
  return d;
}

/** `n` working days after a date. `addBusinessDays(friday, 1)` is Monday. */
export function addBusinessDays(isoDate: string, n: number): string {
  let d = isoDate;
  for (let i = 0; i < n; i++) d = nextBusinessDay(d);
  return d;
}

/**
 * Half past nine on a Sydney morning, as a real instant.
 *
 * Sydney is UTC+10, or UTC+11 on daylight saving, and the only honest way to
 * know which is to ask. So a guess is made, checked against what Sydney
 * actually reads at that moment, and corrected.
 */
export function at0930Sydney(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  for (const offset of [10, 11]) {
    const guess = new Date(Date.UTC(y, m - 1, d, 9 - offset, 30));
    const p = sydneyParts(guess);
    if (p.date === isoDate && p.hour === 9 && p.minute === 30) return guess;
  }
  // Only reachable if Australia changes its offsets. Close enough to be
  // caught by the send window rather than mailing somebody at 3am.
  return new Date(Date.UTC(y, m - 1, d, 23, 30));
}

/**
 * A last line of defence against a time zone mistake.
 *
 * Nothing goes out before eight in the morning or after seven at night,
 * Sydney time, whatever the stored due date claims.
 */
export function isWithinSendWindow(at: Date): boolean {
  const p = sydneyParts(at);
  return isBusinessDay(p.date) && p.hour >= 8 && p.hour < 19;
}

/**
 * When the next chase is due: `n` working days on from an event, at 09:30.
 *
 * Counted from the Sydney date the event happened on, not from UTC, so
 * something that happened at 8am Sydney on a Monday counts as Monday rather
 * than the Sunday it still was in London.
 */
export function dueAfterBusinessDays(from: Date, n: number): Date {
  return at0930Sydney(addBusinessDays(sydneyParts(from).date, n));
}
