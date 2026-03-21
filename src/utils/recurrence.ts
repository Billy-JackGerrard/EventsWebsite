/**
 * Recurrence utilities
 * Generates a list of start/finish Date pairs for a recurring event,
 * up to 1 year from the initial start date.
 */

export type RecurrenceFrequency =
  | "none"
  | "daily"
  | "weekly"
  | "custom-weekly"
  | "monthly-date"
  | "monthly-weekday"
  | "custom-monthly";

export type WeekdayOrdinal = "1st" | "2nd" | "3rd" | "4th" | "last";

export type RecurrenceRule = {
  /** Shared UUID linking all occurrences in the same series. */
  id?: string;
  frequency: RecurrenceFrequency;
  /** For "custom-weekly": how many weeks between occurrences */
  intervalWeeks?: number;
  /** For "custom-monthly": how many months between occurrences */
  intervalMonths?: number;
  /** For "custom-monthly": whether to repeat by weekday position or by date */
  useWeekday?: boolean;
};

/** Shared default used by EventForm and EditEvent. */
export const DEFAULT_RULE: RecurrenceRule = {
  frequency: "weekly",
  intervalWeeks: 2, // biweekly is a common use case and shows more of the UI, so it's a good default for demonstration purposes, esp we already have weekly as an option
  intervalMonths: 2, // same here
  useWeekday: false,
};

export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

/** Returns which ordinal occurrence of a weekday a date falls on within its month. */
export function getOrdinalOfWeekdayInMonth(date: Date): WeekdayOrdinal {
  const weekday = date.getDay();
  const dayOfMonth = date.getDate();

  let count = 0;
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  while (d.getDate() <= dayOfMonth) {
    if (d.getDay() === weekday) count++;
    d.setDate(d.getDate() + 1);
  }

  const next = new Date(date);
  next.setDate(date.getDate() + 7);
  if (next.getMonth() !== date.getMonth()) return "last";

  const ordinals: WeekdayOrdinal[] = ["1st", "2nd", "3rd", "4th"];
  return ordinals[count - 1] ?? "last";
}

/**
 * Produces a human-readable description of a recurrence rule anchored to a
 * specific start date.
 */
export function humaniseRule(rule: RecurrenceRule, firstStart: Date): string {
  const weekdayName = WEEKDAY_NAMES[firstStart.getDay()];
  const ordinal = getOrdinalOfWeekdayInMonth(firstStart);

  switch (rule.frequency) {
    case "daily":
      return "Every day";
    case "weekly":
      return `Every ${weekdayName}`;
    case "custom-weekly": {
      const n = rule.intervalWeeks ?? 2;
      return `Every ${n} weeks on ${weekdayName}s`;
    }
    case "monthly-date":
      return `Every month on the ${ordinalSuffix(firstStart.getDate())}`;
    case "monthly-weekday":
      return `Every month on the ${ordinal} ${weekdayName}`;
    case "custom-monthly": {
      const n = rule.intervalMonths ?? 2;
      const every = n === 1 ? "every month" : `every ${n} months`;
      if (rule.useWeekday) return `The ${ordinal} ${weekdayName}, ${every}`;
      return `The ${ordinalSuffix(firstStart.getDate())}, ${every}`;
    }
    default:
      return "Recurring event";
  }
}

/** Returns the Nth weekday (or last) in a given year/month. */
function nthWeekdayInMonth(
  year: number,
  month: number,
  weekday: number,
  ordinal: WeekdayOrdinal
): Date | null {
  if (ordinal === "last") {
    const last = new Date(year, month + 1, 0);
    while (last.getDay() !== weekday) last.setDate(last.getDate() - 1);
    return new Date(last);
  }

  const ordinalIndex = { "1st": 1, "2nd": 2, "3rd": 3, "4th": 4 }[ordinal] ?? 1;
  let count = 0;
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    if (d.getDay() === weekday) {
      count++;
      if (count === ordinalIndex) return new Date(d);
    }
    d.setDate(d.getDate() + 1);
  }
  return null;
}

/**
 * Given a rule and the first start/finish datetime, produce all occurrences
 * within one year of the start date.
 */
export function expandRecurrences(
  rule: RecurrenceRule,
  firstStart: Date,
  firstFinish: Date | null
): Array<{ start: Date; finish: Date | null }> {
  if (rule.frequency === "none") {
    return [{ start: firstStart, finish: firstFinish }];
  }

  const horizon = new Date(firstStart);
  horizon.setFullYear(horizon.getFullYear() + 1);

  const duration = firstFinish ? firstFinish.getTime() - firstStart.getTime() : null;
  const results: Array<{ start: Date; finish: Date | null }> = [];

  const weekday = firstStart.getDay();
  const ordinal = getOrdinalOfWeekdayInMonth(firstStart);

  const withTime = (d: Date): Date => {
    const out = new Date(d);
    out.setHours(firstStart.getHours(), firstStart.getMinutes(), 0, 0);
    return out;
  };

  const push = (s: Date) =>
    results.push({ start: s, finish: duration !== null ? new Date(s.getTime() + duration) : null });

  if (rule.frequency === "daily") {
    const cur = new Date(firstStart);
    while (cur <= horizon) { push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
    return results;
  }

  if (rule.frequency === "weekly") {
    const cur = new Date(firstStart);
    while (cur <= horizon) { push(new Date(cur)); cur.setDate(cur.getDate() + 7); }
    return results;
  }

  if (rule.frequency === "custom-weekly") {
    const step = (rule.intervalWeeks ?? 2) * 7;
    const cur = new Date(firstStart);
    while (cur <= horizon) { push(new Date(cur)); cur.setDate(cur.getDate() + step); }
    return results;
  }

  if (rule.frequency === "monthly-date") {
    const dayOfMonth = firstStart.getDate();
    let year = firstStart.getFullYear();
    let month = firstStart.getMonth();
    while (true) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const s = withTime(new Date(year, month, Math.min(dayOfMonth, daysInMonth)));
      if (s > horizon) break;
      if (s >= firstStart) push(s);
      month++; if (month > 11) { month = 0; year++; }
    }
    return results;
  }

  if (rule.frequency === "monthly-weekday") {
    let year = firstStart.getFullYear();
    let month = firstStart.getMonth();
    while (true) {
      const candidate = nthWeekdayInMonth(year, month, weekday, ordinal);
      if (candidate) {
        const s = withTime(candidate);
        if (s > horizon) break;
        if (s >= firstStart) push(s);
      }
      month++; if (month > 11) { month = 0; year++; }
    }
    return results;
  }

  if (rule.frequency === "custom-monthly") {
    const { intervalMonths = 2, useWeekday = false } = rule;
    let year = firstStart.getFullYear();
    let month = firstStart.getMonth();
    while (true) {
      let s: Date | null = null;
      if (useWeekday) {
        const candidate = nthWeekdayInMonth(year, month, weekday, ordinal);
        if (candidate) s = withTime(candidate);
      } else {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        s = withTime(new Date(year, month, Math.min(firstStart.getDate(), daysInMonth)));
      }
      if (s) {
        if (s > horizon) break;
        if (s >= firstStart) push(s);
      }
      month += intervalMonths;
      while (month > 11) { month -= 12; year++; }
    }
    return results;
  }

  // All named frequencies are handled above. This point is unreachable at
  // runtime but satisfies the TypeScript return-type checker.
  return [{ start: firstStart, finish: firstFinish }];
}

/**
 * Deduplicates an array of events that may include multiple occurrences from
 * the same recurring series, keeping only the first occurrence of each series.
 * Non-recurring events are always kept.
 *
 * Used by both AdminQueue and main.tsx to get an accurate pending count.
 */
export function deduplicateByRecurrence<T extends { id: string | number; recurrence?: RecurrenceRule | null }>(
  events: T[]
): T[] {
  const seen = new Set<string>();
  return events.filter(ev => {
    const rid = ev.recurrence?.id;
    if (!rid) return true;
    if (seen.has(rid)) return false;
    seen.add(rid);
    return true;
  });
}