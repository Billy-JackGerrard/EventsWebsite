import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { MONTHS, formatTime } from "../utils/dates";
import "./Calendar.css";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
type Event = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  starts_at: string;
  finishes_at?: string;
};

export default function Calendar() {
  const today = new Date();
  const [current, setCurrent] = useState({
    month: today.getMonth(),
    year: today.getFullYear(),
  });
  const [selected, setSelected] = useState<number | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);

      const from = new Date(current.year, current.month, 1).toISOString();
      const to   = new Date(current.year, current.month + 1, 0, 23, 59, 59).toISOString();

      // Fetch events that overlap with this month:
      // - starts within the month, OR
      // - started before the month but finishes during or after it
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("approved", true)
        .or(`and(starts_at.gte.${from},starts_at.lte.${to}),and(starts_at.lt.${from},finishes_at.gte.${from})`)
        .order("starts_at", { ascending: true });

      if (error) console.error("Error fetching events:", error);
      else setEvents(data || []);

      setLoading(false);
    };

    fetchEvents();
  }, [current.month, current.year]);

  const prev = () =>
    setCurrent(c =>
      c.month === 0 ? { month: 11, year: c.year - 1 } : { month: c.month - 1, year: c.year }
    );
  const next = () =>
    setCurrent(c =>
      c.month === 11 ? { month: 0, year: c.year + 1 } : { month: c.month + 1, year: c.year }
    );
  
  const eventsOnDay = (day: number) => {
    const cell = new Date(current.year, current.month, day).toLocaleDateString("en-CA");

    return events.filter(e => {
      const start  = new Date(e.starts_at).toLocaleDateString("en-CA");
      const finish = new Date(e.finishes_at ?? e.starts_at).toLocaleDateString("en-CA");

      return cell >= start && cell <= finish;
    });
  };

  const isToday    = (day: number) => day === today.getDate() && current.month === today.getMonth() && current.year === today.getFullYear();
  const isSelected = (day: number) => selected === day;

  const firstDay    = new Date(current.year, current.month, 1).getDay();
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();

  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedEvents = selected ? eventsOnDay(selected) : [];

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
              !day                   ? "calendar-cell--empty"    : "",
              day && isToday(day)    ? "calendar-cell--today"    : "",
              day && isSelected(day) ? "calendar-cell--selected" : "",
            ].filter(Boolean).join(" ");

            return (
              <div key={i} className={cellClass} onClick={() => day && setSelected(day)}>
                {day && (
                  <>
                    <span className="calendar-day-number">{day}</span>
                    {eventsOnDay(day).length > 0 && <span className="calendar-event-dot" />}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Event panel */}
        <div className="calendar-event-panel">
          {loading ? (
            <div className="calendar-event-placeholder">Loading events…</div>
          ) : selected ? (
            <>
              <div className="calendar-event-date">
                {selected} {MONTHS[current.month]}
              </div>
              {selectedEvents.length > 0 ? (
                selectedEvents.map(ev => (
                  <div key={ev.id} className="calendar-event-item">
                    · {formatTime(ev.starts_at)}{ev.finishes_at ? ` – ${formatTime(ev.finishes_at)}` : ""} — {ev.title}
                    {ev.location && <span style={{ opacity: 0.6 }}> @ {ev.location}</span>}
                  </div>
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