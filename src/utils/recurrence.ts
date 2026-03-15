/**
 * Recurrence utilities
 * Generates a list of start/finish Date pairs for a recurring event,
 * up to 1 year from the initial start date.
 */

export type RecurrenceFrequency =
  | "none"
  | "daily"
  | "weekly"
  | "monthly-date"       // e.g. every 15th
  | "monthly-weekday"    // e.g. last Thursday, 2nd Monday
  | "custom-monthly";    // every N months on Nth weekday or date

export type WeekdayOrdinal = "1st" | "2nd" | "3rd" | "4th" | "last";

export type RecurrenceRule = {
  frequency: RecurrenceFrequency;
  // For "custom-monthly": how many months between occurrences
  intervalMonths?: number;
  // For "monthly-weekday" and "custom-monthly" when useWeekday=true
  weekday?: number;         // 0=Sun … 6=Sat
  ordinal?: WeekdayOrdinal; // which occurrence in the month
  // For "custom-monthly": whether to repeat by weekday or by date
  useWeekday?: boolean;
};

/** Returns the Nth weekday (or last) in a given year/month. */
function nthWeekdayInMonth(
  year: number,
  month: number,
  weekday: number,
  ordinal: WeekdayOrdinal
): Date | null {
  if (ordinal === "last") {
    // Walk backwards from last day of month
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
  return null; // e.g. 5th Monday doesn't exist this month
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

  // Helper: create a start date with the same time as firstStart but on a new calendar date
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
    // Every month on the same date (e.g. every 15th)
    const dayOfMonth = firstStart.getDate();
    let year = firstStart.getFullYear();
    let month = firstStart.getMonth();

    while (true) {
      // Clamp to end of month (e.g. 31st → 28th in Feb)
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
    // e.g. "last Thursday" every month
    const { weekday = 4, ordinal = "last" } = rule;
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
    // Every N months, on either the same date or the same Nth weekday
    const { intervalMonths = 2, useWeekday = false, weekday = 1, ordinal = "1st" } = rule;
    let year = firstStart.getFullYear();
    let month = firstStart.getMonth();
    let isFirst = true;

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
        if (isFirst || s >= firstStart) {
          const f = duration !== null ? new Date(s.getTime() + duration) : null;
          results.push({ start: s, finish: f });
        }
      }

      isFirst = false;
      month += intervalMonths;
      while (month > 11) { month -= 12; year++; }
    }
    return results;
  }

  return [{ start: firstStart, finish: firstFinish }];
}