import { useMemo } from "react";
import type { RecurrenceRule } from "../../utils/recurrence";
import { expandRecurrences, getOrdinalOfWeekdayInMonth } from "../../utils/recurrence";
import "./RecurrencePicker.css";

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Props = {
  enabled: boolean;
  rule: RecurrenceRule;
  startsAt: string;         // "YYYY-MM-DDTHH:mm" local string — may be empty
  onToggle: (v: boolean) => void;
  onRuleChange: (r: RecurrenceRule) => void;
};

function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function humaniseRule(rule: RecurrenceRule, firstStart: Date): string {
  const weekdayName = WEEKDAY_NAMES[firstStart.getDay()];
  const ordinal = getOrdinalOfWeekdayInMonth(firstStart);

  switch (rule.frequency) {
    case "daily":
      return "Every day";
    case "weekly":
      return `Every ${weekdayName}`;
    case "monthly-date":
      return `Every month on the ${ordinalSuffix(firstStart.getDate())}`;
    case "monthly-weekday":
      return `Every month on the ${ordinal} ${weekdayName}`;
    case "custom-monthly": {
      const n = rule.intervalMonths ?? 2;
      const every = n === 1 ? "every month" : `every ${n} months`;
      if (rule.useWeekday) {
        return `The ${ordinal} ${weekdayName}, ${every}`;
      }
      return `The ${ordinalSuffix(firstStart.getDate())}, ${every}`;
    }
    default:
      return "";
  }
}

export default function RecurrencePicker({ enabled, rule, startsAt, onToggle, onRuleChange }: Props) {
  const firstStart: Date | null = startsAt ? new Date(startsAt) : null;

  const occurrenceCount = useMemo(() => {
    if (!enabled || !firstStart || rule.frequency === "none") return 0;
    return expandRecurrences(rule, firstStart, null).length;
  }, [enabled, rule, startsAt]);

  const summary = enabled && firstStart ? humaniseRule(rule, firstStart) : null;

  const set = (patch: Partial<RecurrenceRule>) => onRuleChange({ ...rule, ...patch });

  return (
    <div>
      {/* Toggle */}
      <div className="recurrence-toggle" onClick={() => onToggle(!enabled)}>
        <div className={`recurrence-toggle-track ${enabled ? "recurrence-toggle-track--on" : ""}`}>
          <div className="recurrence-toggle-thumb" />
        </div>
        <span className="recurrence-toggle-label">Recurring Event</span>
      </div>

      {enabled && (
        <div className="recurrence-panel">

          {!firstStart ? (
            <div className="recurrence-preview">
              <span className="recurrence-preview-icon">⚠</span>
              <span className="recurrence-preview-text">Set a start date to configure recurrence</span>
            </div>
          ) : (
            <>
              {/* Frequency selector */}
              <div className="recurrence-row">
                <label className="recurrence-label">Repeats</label>
                <select
                  className="recurrence-select"
                  value={rule.frequency === "none" ? "weekly" : rule.frequency}
                  onChange={e => set({ frequency: e.target.value as RecurrenceRule["frequency"] })}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly — every {WEEKDAY_NAMES[firstStart.getDay()]}</option>
                  <option value="monthly-date">Monthly — on the {ordinalSuffix(firstStart.getDate())}</option>
                  <option value="monthly-weekday">Monthly — on the {getOrdinalOfWeekdayInMonth(firstStart)} {WEEKDAY_NAMES[firstStart.getDay()]}</option>
                  <option value="custom-monthly">Every N months</option>
                </select>
              </div>

              {/* Custom-monthly interval + by-date or by-weekday */}
              {rule.frequency === "custom-monthly" && (
                <>
                  <div className="recurrence-row">
                    <label className="recurrence-label">Interval</label>
                    <div className="recurrence-inline">
                      <span className="recurrence-inline-sep">Every</span>
                      <select
                        className="recurrence-select"
                        value={rule.intervalMonths ?? 2}
                        onChange={e => set({ intervalMonths: Number(e.target.value) })}
                      >
                        {[2, 3, 4, 6].map(n => <option key={n} value={n}>{n} months</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="recurrence-row">
                    <label className="recurrence-label">Repeat by</label>
                    <select
                      className="recurrence-select"
                      value={rule.useWeekday ? "weekday" : "date"}
                      onChange={e => set({ useWeekday: e.target.value === "weekday" })}
                    >
                      <option value="date">Same date — the {ordinalSuffix(firstStart.getDate())}</option>
                      <option value="weekday">Same weekday — the {getOrdinalOfWeekdayInMonth(firstStart)} {WEEKDAY_NAMES[firstStart.getDay()]}</option>
                    </select>
                  </div>
                </>
              )}

              {/* Preview */}
              {summary && (
                <div className="recurrence-preview">
                  <span className="recurrence-preview-icon">↻</span>
                  <div>
                    <div className="recurrence-preview-text">{summary}</div>
                    {occurrenceCount > 0 && (
                      <div className="recurrence-preview-count">
                        {occurrenceCount} occurrence{occurrenceCount !== 1 ? "s" : ""} over the next year
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}