/**
 * Recurrence utilities
 * Generates a list of start/finish Date pairs for a recurring event,
 * up to 1 year from the initial start date.
 *
 * weekday and ordinal are now always derived from firstStart — they are
 * no longer stored in RecurrenceRule, removing the redundant picker UI.
 */

export type RecurrenceFrequency =
  | "none"
  | "daily"
  | "weekly"
  | "monthly-date"       // e.g. every 15th
  | "monthly-weekday"    // e.g. last Thursday, 2nd Monday — derived from firstStart
  | "custom-monthly";    // every N months on Nth weekday or date — derived from firstStart

export type WeekdayOrdinal = "1st" | "2nd" | "3rd" | "4th" | "last";

export type RecurrenceRule = {
  frequency: RecurrenceFrequency;
  // For "custom-monthly": how many months between occurrences
  intervalMonths?: number;
  // For "custom-monthly": whether to repeat by weekday position or by date
  useWeekday?: boolean;
  // NOTE: weekday and ordinal are intentionally removed from the rule —
  // they are always derived from the firstStart date at expansion time.
};

/** Shared default used by EventForm and EditEvent. */
export const DEFAULT_RULE: RecurrenceRule = {
  frequency: "weekly",
  intervalMonths: 2,
  useWeekday: false,
};

/** Returns which ordinal occurrence of a weekday a date falls on within its month. */
export function getOrdinalOfWeekdayInMonth(date: Date): WeekdayOrdinal {
  const weekday = date.getDay();
  const dayOfMonth = date.getDate();

  // Count how many times this weekday has appeared so far this month
  let count = 0;
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  while (d.getDate() <= dayOfMonth) {
    if (d.getDay() === weekday) count++;
    d.setDate(d.getDate() + 1);
  }

  // Check if this is also the LAST occurrence of that weekday in the month
  const next = new Date(date);
  next.setDate(date.getDate() + 7);
  if (next.getMonth() !== date.getMonth()) {
    return "last";
  }

  const ordinals: WeekdayOrdinal[] = ["1st", "2nd", "3rd", "4th"];
  return ordinals[count - 1] ?? "last";
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
 *
 * weekday and ordinal are always derived from firstStart.
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

  // Derive weekday and ordinal from the anchor date
  const weekday = firstStart.getDay();
  const ordinal = getOrdinalOfWeekdayInMonth(firstStart);

  const withTime = (d: Date): Date => {
    const out = new Date(d);
    out.setHours(firstStart.getHours(), firstStart.getMinutes(), 0, 0);
    return out;
  };

  if (rule.frequency === "daily") {
    const cur = new Date(firstStart);
    while (cur <= horizon) {
      const s = new Date(cur);
      const f = duration !== null ? new Date(s.getTime() + duration) : null;
      results.push({ start: s, finish: f });
      cur.setDate(cur.getDate() + 1);
    }
    return results;
  }

  if (rule.frequency === "weekly") {
    const cur = new Date(firstStart);
    while (cur <= horizon) {
      const s = new Date(cur);
      const f = duration !== null ? new Date(s.getTime() + duration) : null;
      results.push({ start: s, finish: f });
      cur.setDate(cur.getDate() + 7);
    }
    return results;
  }

  if (rule.frequency === "monthly-date") {
    const dayOfMonth = firstStart.getDate();
    let year = firstStart.getFullYear();
    let month = firstStart.getMonth();

    while (true) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const day = Math.min(dayOfMonth, daysInMonth);
      const s = withTime(new Date(year, month, day));
      if (s > horizon) break;
      if (s >= firstStart) {
        const f = duration !== null ? new Date(s.getTime() + duration) : null;
        results.push({ start: s, finish: f });
      }
      month++;
      if (month > 11) { month = 0; year++; }
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
        if (s >= firstStart) {
          const f = duration !== null ? new Date(s.getTime() + duration) : null;
          results.push({ start: s, finish: f });
        }
      }
      month++;
      if (month > 11) { month = 0; year++; }
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
        const dayOfMonth = firstStart.getDate();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        s = withTime(new Date(year, month, Math.min(dayOfMonth, daysInMonth)));
      }

      if (s) {
        if (s > horizon) break;
        if (s >= firstStart) {
          const f = duration !== null ? new Date(s.getTime() + duration) : null;
          results.push({ start: s, finish: f });
        }
      }

      month += intervalMonths;
      while (month > 11) { month -= 12; year++; }
    }
    return results;
  }

  return [{ start: firstStart, finish: firstFinish }];
}