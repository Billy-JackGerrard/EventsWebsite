import { useMemo } from "react";
import type { RecurrenceRule } from "../../utils/recurrence";
import { expandRecurrences, getOrdinalOfWeekdayInMonth, humaniseRule, ordinalSuffix, WEEKDAY_NAMES } from "../../utils/recurrence";
import "./RecurrencePicker.css";

type Props = {
  enabled: boolean;
  rule: RecurrenceRule;
  startsAt: string;
  onToggle: (v: boolean) => void;
  onRuleChange: (r: RecurrenceRule) => void;
};

export default function RecurrencePicker({ enabled, rule, startsAt, onToggle, onRuleChange }: Props) {
  const firstStart: Date | null = startsAt ? new Date(startsAt) : null;

  // firstStart is derived from startsAt — derive it inside the memo too so the
  // closure is self-contained and the deps accurately reflect what's used.
  const occurrenceCount = useMemo(() => {
    const start = startsAt ? new Date(startsAt) : null;
    if (!enabled || !start || rule.frequency === "none") return 0;
    return expandRecurrences(rule, start, null).length;
  }, [enabled, rule, startsAt]);

  const summary = enabled && firstStart ? humaniseRule(rule, firstStart) : null;

  const set = (patch: Partial<RecurrenceRule>) => onRuleChange({ ...rule, ...patch });

  return (
    <div>
      <button type="button" className="recurrence-toggle" onClick={() => onToggle(!enabled)}>
        <div className={`recurrence-toggle-track ${enabled ? "recurrence-toggle-track--on" : ""}`}>
          <div className="recurrence-toggle-thumb" />
        </div>
        <span className="recurrence-toggle-label">Recurring Event</span>
      </button>

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
                  <option value="custom-weekly">Every N weeks</option>
                  <option value="monthly-date">Monthly — on the {ordinalSuffix(firstStart.getDate())}</option>
                  <option value="monthly-weekday">Monthly — on the {getOrdinalOfWeekdayInMonth(firstStart)} {WEEKDAY_NAMES[firstStart.getDay()]}</option>
                  <option value="custom-monthly">Every N months</option>
                </select>
              </div>

              {/* Custom-weekly interval */}
              {rule.frequency === "custom-weekly" && (
                <div className="recurrence-row">
                  <label className="recurrence-label">Interval</label>
                  <div className="recurrence-inline">
                    <span className="recurrence-inline-sep">Every</span>
                    <select
                      className="recurrence-select"
                      value={rule.intervalWeeks ?? 2}
                      onChange={e => set({ intervalWeeks: Number(e.target.value) })}
                    >
                      {[2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                        <option key={n} value={n}>{n} weeks</option>
                      ))}
                    </select>
                    <span className="recurrence-inline-sep">on {WEEKDAY_NAMES[firstStart.getDay()]}s</span>
                  </div>
                </div>
              )}

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