import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { MONTHS, formatDateTimeRange } from "../utils/dates";
import type { Event } from "../utils/types";
import EventDetails from "./events/EventDetails";
import { useCalendarEvents } from "../hooks/useCalendarEvents";
import "./Calendar.css";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Props = {
  isLoggedIn: boolean;
  onEditEvent: (event: Event) => void;
};

export default function Calendar({ isLoggedIn, onEditEvent }: Props) {

  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const msUntilMidnight = (): number => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      return midnight.getTime() - now.getTime();
    };

    const timeout = setTimeout(() => {
      setToday(new Date());
      interval = setInterval(() => setToday(new Date()), 24 * 60 * 60 * 1000);
    }, msUntilMidnight());

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  const [current, setCurrent] = useState({
    month: today.getMonth(),
    year: today.getFullYear(),
  });

  const [selected, setSelected] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);

  const { events, allEvents, loading } = useCalendarEvents(current.month, current.year);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const prev = () => {
    setSelected(null);
    setDetailEvent(null);
    setCurrent(c => c.month === 0 ? { month: 11, year: c.year - 1 } : { month: c.month - 1, year: c.year });
  };

  const next = () => {
    setSelected(null);
    setDetailEvent(null);
    setCurrent(c => c.month === 11 ? { month: 0, year: c.year + 1 } : { month: c.month + 1, year: c.year });
  };

  // Local helper for plain Date objects — mirrors toLocalDateKey's format but
  // takes a Date rather than an ISO string.
  const dateKey = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const e of events) {
      // Start the cursor at local midnight on the event's start date.
      // Using new Date(e.starts_at) then zeroing the time avoids the
      // UTC-midnight trap that new Date("YYYY-MM-DD") falls into in UTC-N zones.
      const cursor = new Date(e.starts_at);
      cursor.setHours(0, 0, 0, 0);

      const end = e.finishes_at ? new Date(e.finishes_at) : new Date(e.starts_at);
      end.setHours(0, 0, 0, 0);

      while (cursor <= end) {
        const key = dateKey(cursor);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(e);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return map;
  }, [events]);

  const eventsOnDay = (day: number): Event[] =>
    eventsByDate.get(dateKey(new Date(current.year, current.month, day))) ?? [];

  const isToday    = (day: number) =>
    day === today.getDate() && current.month === today.getMonth() && current.year === today.getFullYear();
  const isSelected = (day: number) => selected === day;

  // Fix #2: stable reference via useCallback so the searchResults memo's
  // dependency array correctly covers the function's actual inputs.
  const matchesSearch = useCallback((event: Event, query: string): boolean => {
    if (!query.trim()) return false;
    const q = query.toLowerCase();
    const haystack = [event.title, event.description ?? "", event.location ?? ""].join(" ").toLowerCase();
    return q.split(/\s+/).filter(Boolean).every(word => haystack.includes(word));
  }, []); // no external deps — pure function of its arguments

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return allEvents.filter(e => matchesSearch(e, searchQuery));
  }, [searchQuery, allEvents, matchesSearch]);

  const handleResultClick = (event: Event) => {
    const d = new Date(event.starts_at);
    setCurrent({ month: d.getMonth(), year: d.getFullYear() });
    setSelected(d.getDate());
    setSearchQuery("");
    setSearchOpen(false);
    setDetailEvent(event);
  };

  const handleSearchToggle = () => {
    if (searchOpen) {
      setSearchOpen(false);
      setSearchQuery("");
    } else {
      setSearchOpen(true);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  };

  const firstDay    = new Date(current.year, current.month, 1).getDay();
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();

  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedEvents = selected ? eventsOnDay(selected) : [];

  return (
    <>
      <div className="calendar-page">
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
          <div className="calendar-card">

            {/* Header */}
            <div className="calendar-header">
              <button className="calendar-nav-btn" onClick={prev}>‹</button>

              <div className="calendar-header-center">
                {searchOpen ? (
                  <div className="calendar-search-wrap" ref={dropdownRef}>
                    <div className="calendar-search-bar">
                      <span className="calendar-search-icon">⌕</span>
                      <input
                        ref={searchInputRef}
                        className="calendar-search-input"
                        type="text"
                        placeholder="Search events…"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onKeyDown={e => e.key === "Escape" && handleSearchToggle()}
                      />
                    </div>

                    {searchQuery.trim().length > 0 && (
                      <div className="calendar-search-dropdown">
                        {searchResults.length === 0 ? (
                          <div className="calendar-search-dropdown-empty">No matching events</div>
                        ) : (
                          searchResults.map(ev => (
                            <button
                              key={ev.id}
                              className="calendar-search-result"
                              onClick={() => handleResultClick(ev)}
                            >
                              <span className="calendar-search-result-title">{ev.title}</span>
                              <span className="calendar-search-result-date">
                                {formatDateTimeRange(ev.starts_at, ev.finishes_at)}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="calendar-title">
                    <div className="calendar-month">{MONTHS[current.month]}</div>
                    <div className="calendar-year">{current.year}</div>
                  </div>
                )}
              </div>

              <div className="calendar-header-actions">
                <button
                  className={`calendar-search-btn ${searchOpen ? "calendar-search-btn--active" : ""}`}
                  onClick={handleSearchToggle}
                  title={searchOpen ? "Close search" : "Search events"}
                >
                  {searchOpen ? "✕" : "⌕"}
                </button>
                <button className="calendar-nav-btn" onClick={next}>›</button>
              </div>
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
                  !day                    ? "calendar-cell--empty"    : "",
                  day && isToday(day)     ? "calendar-cell--today"    : "",
                  day && isSelected(day)  ? "calendar-cell--selected" : "",
                ].filter(Boolean).join(" ");

                return (
                  <div key={i} className={cellClass} onClick={() => { if (day) { setSelected(day); setDetailEvent(null); } }}>
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
                      <div
                        key={ev.id}
                        className="calendar-event-item calendar-event-item--clickable"
                        onClick={() => setDetailEvent(ev)}
                      >
                        · {new Date(ev.starts_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        {ev.finishes_at ? ` – ${new Date(ev.finishes_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : ""} — {ev.title}
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

          {/* EventDetails card */}
          {detailEvent && (
            <EventDetails
              event={detailEvent}
              isLoggedIn={isLoggedIn}
              onClose={() => setDetailEvent(null)}
              onEdit={onEditEvent}
            />
          )}
        </div>
      </div>
    </>
  );
}