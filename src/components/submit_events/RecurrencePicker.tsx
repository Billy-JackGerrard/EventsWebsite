import { useMemo } from "react";
import type { RecurrenceRule, WeekdayOrdinal } from ".../utils/recurrence";
import { expandRecurrences } from ".../utils/recurrence";
import "./RecurrencePicker.css";

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ORDINALS: WeekdayOrdinal[] = ["1st", "2nd", "3rd", "4th", "last"];

type Props = {
  enabled: boolean;
  rule: RecurrenceRule;
  startsAt: string;         // "YYYY-MM-DDTHH:mm" local string — may be empty
  onToggle: (v: boolean) => void;
  onRuleChange: (r: RecurrenceRule) => void;
};

function humaniseRule(rule: RecurrenceRule, firstStart: Date | null): string {
  if (!firstStart) return "Set a start date first";

  const weekdayName = WEEKDAY_NAMES[rule.weekday ?? firstStart.getDay()];
  const ordinal = rule.ordinal ?? "1st";

  switch (rule.frequency) {
    case "daily":
      return "Every day";
    case "weekly":
      return `Every ${WEEKDAY_NAMES[firstStart.getDay()]}`;
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

function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

export default function RecurrencePicker({ enabled, rule, startsAt, onToggle, onRuleChange }: Props) {
  const firstStart: Date | null = startsAt ? new Date(startsAt) : null;

  const occurrenceCount = useMemo(() => {
    if (!enabled || !firstStart || rule.frequency === "none") return 0;
    const occ = expandRecurrences(rule, firstStart, null);
    return occ.length;
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

          {/* Frequency selector */}
          <div className="recurrence-row">
            <label className="recurrence-label">Repeats</label>
            <select
              className="recurrence-select"
              value={rule.frequency === "none" ? "weekly" : rule.frequency}
              onChange={e => set({ frequency: e.target.value as RecurrenceRule["frequency"] })}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly (same day of week)</option>
              <option value="monthly-date">Monthly (same date)</option>
              <option value="monthly-weekday">Monthly (same weekday)</option>
              <option value="custom-monthly">Every N months</option>
            </select>
          </div>

          {/* Monthly-weekday options */}
          {rule.frequency === "monthly-weekday" && (
            <div className="recurrence-row">
              <label className="recurrence-label">Which occurrence</label>
              <div className="recurrence-inline">
                <select
                  className="recurrence-select"
                  value={rule.ordinal ?? "1st"}
                  onChange={e => set({ ordinal: e.target.value as WeekdayOrdinal })}
                >
                  {ORDINALS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <span className="recurrence-inline-sep">on</span>
                <select
                  className="recurrence-select"
                  value={rule.weekday ?? (firstStart?.getDay() ?? 1)}
                  onChange={e => set({ weekday: Number(e.target.value) })}
                >
                  {WEEKDAY_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Custom-monthly options */}
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
                  <option value="date">Same date (e.g. the {firstStart ? ordinalSuffix(firstStart.getDate()) : "…"})</option>
                  <option value="weekday">Same weekday position</option>
                </select>
              </div>

              {rule.useWeekday && (
                <div className="recurrence-row">
                  <label className="recurrence-label">Which occurrence</label>
                  <div className="recurrence-inline">
                    <select
                      className="recurrence-select"
                      value={rule.ordinal ?? "1st"}
                      onChange={e => set({ ordinal: e.target.value as WeekdayOrdinal })}
                    >
                      {ORDINALS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <span className="recurrence-inline-sep">on</span>
                    <select
                      className="recurrence-select"
                      value={rule.weekday ?? (firstStart?.getDay() ?? 1)}
                      onChange={e => set({ weekday: Number(e.target.value) })}
                    >
                      {WEEKDAY_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
                    </select>
                  </div>
                </div>
              )}
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

          {!firstStart && (
            <div className="recurrence-preview">
              <span className="recurrence-preview-icon">⚠</span>
              <span className="recurrence-preview-text">Set a start date to preview occurrences</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}