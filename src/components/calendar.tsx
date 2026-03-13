import { useState } from "react";
import "./calendar.css";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

// Replace with your own events data or fetch from an API
const events: Record<string, string[]> = {
  "2026-3-5":  ["Team standup"],
  "2026-3-12": ["Design review", "Lunch with Sarah"],
  "2026-3-18": ["Sprint planning"],
  "2026-3-25": ["Product demo"],
  "2026-3-28": ["Monthly retro"],
};

export default function Calendar() {
  
  const today = new Date();
  const [current, setCurrent] = useState({
    month: today.getMonth(),
    year: today.getFullYear(),
  });
  const [selected, setSelected] = useState<number | null>(null);

  const firstDay    = new Date(current.year, current.month, 1).getDay();
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();

  const prev = () =>
    setCurrent(c =>
      c.month === 0 ? { month: 11, year: c.year - 1 } : { month: c.month - 1, year: c.year }
    );
  const next = () =>
    setCurrent(c =>
      c.month === 11 ? { month: 0, year: c.year + 1 } : { month: c.month + 1, year: c.year }
    );

  const getKey     = (day: number) => `${current.year}-${current.month + 1}-${day}`;
  const isToday    = (day: number) => day === today.getDate() && current.month === today.getMonth() && current.year === today.getFullYear();
  const isSelected = (day: number) => selected === day;
  const hasEvents  = (day: number) => !!events[getKey(day)];

  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedEvents = selected ? (events[getKey(selected)] || []) : [];
  const selectedDay    = selected ?? null;

  return (
    <div className="calendar-page">
      <div className="calendar-card">

        {/* Header */}
        <div className="calendar-header">
          <button className="calendar-nav-btn" onClick={prev}>‹</button>
          <div className="calendar-title">
            <div className="calendar-month">{MONTHS[current.month]}</div>
            <div className="calendar-year">{current.year}</div>
          </div>
          <button className="calendar-nav-btn" onClick={next}>›</button>
        </div>

        {/* Day labels */}
        <div className="calendar-day-labels">
          {DAYS.map(d => (
            <div key={d} className="calendar-day-label">{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div className="calendar-grid">
          {cells.map((day, i) => {
            const cellClass = [
              "calendar-cell",
              !day            ? "calendar-cell--empty"    : "",
              day && isToday(day)    ? "calendar-cell--today"    : "",
              day && isSelected(day) ? "calendar-cell--selected" : "",
            ].filter(Boolean).join(" ");

            return (
              <div
                key={i}
                className={cellClass}
                onClick={() => day && setSelected(day)}
              >
                {day && (
                  <>
                    <span className="calendar-day-number">{day}</span>
                    {hasEvents(day) && <span className="calendar-event-dot" />}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Event panel */}
        <div className="calendar-event-panel">
          {selected ? (
            <>
              <div className="calendar-event-date">
                {selectedDay} {MONTHS[current.month]}
              </div>
              {selectedEvents.length > 0 ? (
                selectedEvents.map((ev, i) => (
                  <div key={i} className="calendar-event-item">· {ev}</div>
                ))
              ) : (
                <div className="calendar-event-empty">No events scheduled</div>
              )}
            </>
          ) : (
            <div className="calendar-event-placeholder">Select a day to view events</div>
          )}
        </div>

      </div>
    </div>
  );
}