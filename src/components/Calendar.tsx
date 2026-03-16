import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { MONTHS, formatDateTimeRange, toLocalDateKey } from "../utils/dates";
import type { Event } from "../utils/types";
import EventDetails from "./events/EventDetails";
import { supabase } from "../supabaseClient";
import { useCalendarEvents } from "../hooks/useCalendarEvents";
import "./Calendar.css";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SEARCH_RESULT_LIMIT = 10;
// The calendar is bounded to a 2-year window: 1 year back, 1 year forward.
const MONTHS_BEFORE_INIT = 2;
const MONTHS_BEFORE_MAX  = 11;  // hard ceiling — never scroll beyond 1 year back
const MONTHS_AFTER_INIT  = 11;  // show up to 11 months ahead on load (= 1 year total)
const MONTHS_AFTER_MAX   = 11;  // hard ceiling — never scroll beyond 1 year ahead

type MonthKey = { month: number; year: number };

function addMonths(base: MonthKey, delta: number): MonthKey {
  let m = base.month + delta;
  let y = base.year;
  while (m > 11) { m -= 12; y++; }
  while (m < 0)  { m += 12; y--; }
  return { month: m, year: y };
}

type Props = {
  isLoggedIn: boolean;
  onEditEvent: (event: Event) => void;
};

// ── Single month block ──────────────────────────────────────────────────────

type MonthBlockProps = {
  monthKey: MonthKey;
  today: Date;
  selected: { month: number; year: number; day: number } | null;
  onSelectDay: (day: number, month: number, year: number) => void;
  eventsByDate: Map<string, Event[]>;
  monthRef?: (el: HTMLDivElement | null) => void;
};

function MonthBlock({ monthKey, today, selected, onSelectDay, eventsByDate, monthRef }: MonthBlockProps) {
  const { month, year } = monthKey;
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const isSelected = (day: number) =>
    selected !== null && selected.day === day && selected.month === month && selected.year === year;

  const eventsOnDay = (day: number): Event[] =>
    eventsByDate.get(toLocalDateKey(new Date(year, month, day).toISOString())) ?? [];

  return (
    <div className="calendar-month-block" ref={monthRef} data-month={month} data-year={year}>
      {/* Sticky month label */}
      <div className="calendar-month-label">
        <span className="calendar-month-label-name">{MONTHS[month]}</span>
        <span className="calendar-month-label-year">{year}</span>
      </div>

      {/* Day-of-week headers */}
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
            !day                  ? "calendar-cell--empty"    : "",
            day && isToday(day)   ? "calendar-cell--today"    : "",
            day && isSelected(day)? "calendar-cell--selected" : "",
          ].filter(Boolean).join(" ");

          return (
            <div
              key={i}
              className={cellClass}
              onClick={() => { if (day) onSelectDay(day, month, year); }}
            >
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
    </div>
  );
}

// ── Main Calendar ───────────────────────────────────────────────────────────

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
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, []);

  const todayKey: MonthKey = { month: today.getMonth(), year: today.getFullYear() };

  // The visible window of months (forward window is hard-capped at 1 year)
  const [monthsBefore, setMonthsBefore] = useState(MONTHS_BEFORE_INIT);
  const [monthsAfter,  setMonthsAfter]  = useState(MONTHS_AFTER_INIT);

  const monthKeys: MonthKey[] = useMemo(() => {
    const keys: MonthKey[] = [];
    for (let i = -monthsBefore; i <= monthsAfter; i++) {
      keys.push(addMonths(todayKey, i));
    }
    return keys;
  }, [monthsBefore, monthsAfter, today]);

  // Fetch events for the whole visible window at once
  const windowStart = monthKeys[0];
  const windowEnd   = monthKeys[monthKeys.length - 1];
  const { eventsByDate, allEvents, loading } = useCalendarEvents(windowStart, windowEnd);

  // Selection: full date (day + month + year)
  const [selected, setSelected] = useState<{ month: number; year: number; day: number } | null>(null);
  const [detailEvent, setDetailEvent]   = useState<Event | null>(null);
  const [searchOpen,  setSearchOpen]    = useState(false);
  const [searchQuery, setSearchQuery]   = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef    = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const monthRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const todayMonthRef = useRef<HTMLDivElement | null>(null);

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Scroll to today's month on first load
  useEffect(() => {
    if (todayMonthRef.current && scrollContainerRef.current) {
      // Small delay ensures DOM is fully painted
      setTimeout(() => {
        todayMonthRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
      }, 50);
    }
  }, []);

  // Auto-delete events that finished more than 1 year ago.
  // Runs once on mount — only admins can delete, so this is a best-effort
  // silent cleanup; errors are intentionally swallowed.
  // Auto-delete events older than 1 year whenever an admin logs in.
  useEffect(() => {
    if (!isLoggedIn) return;
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    supabase
      .from("events")
      .delete()
      .or(
        `finishes_at.lt.${cutoff.toISOString()},` +
        `and(finishes_at.is.null,starts_at.lt.${cutoff.toISOString()})`
      );
  }, [isLoggedIn]);

  // Load more months when user scrolls near the top or bottom
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handler = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollTop < 300)                               setMonthsBefore(b => Math.min(b + 3, MONTHS_BEFORE_MAX));
      if (scrollHeight - scrollTop - clientHeight < 400) setMonthsAfter(a => Math.min(a + 3, MONTHS_AFTER_MAX));
    };
    container.addEventListener("scroll", handler, { passive: true });
    return () => container.removeEventListener("scroll", handler);
  }, []);

  const scrollToToday = () => {
    todayMonthRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Search
  const matchesSearch = useCallback((event: Event, query: string): boolean => {
    if (!query.trim()) return false;
    const q = query.toLowerCase();
    const haystack = [event.title, event.description ?? "", event.location ?? ""].join(" ").toLowerCase();
    return q.split(/\s+/).filter(Boolean).every(word => haystack.includes(word));
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const matches: Event[] = [];
    for (const e of allEvents) {
      if (matchesSearch(e, searchQuery)) {
        matches.push(e);
        if (matches.length === SEARCH_RESULT_LIMIT) break;
      }
    }
    return matches;
  }, [searchQuery, allEvents, matchesSearch]);

  const handleResultClick = (event: Event) => {
    const d = new Date(event.starts_at);
    const targetMonth = d.getMonth();
    const targetYear  = d.getFullYear();

    setSelected({ month: targetMonth, year: targetYear, day: d.getDate() });
    setSearchQuery("");
    setSearchOpen(false);
    setDetailEvent(event);

    // Scroll to that month
    setTimeout(() => {
      const key = `${targetYear}-${targetMonth}`;
      monthRefs.current.get(key)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
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

  const handleSelectDay = (day: number, month: number, year: number) => {
    setSelected({ day, month, year });
    setDetailEvent(null);
  };

  const selectedEvents: Event[] = useMemo(() => {
    if (!selected) return [];
    return eventsByDate.get(
      toLocalDateKey(new Date(selected.year, selected.month, selected.day).toISOString())
    ) ?? [];
  }, [selected, eventsByDate]);

  return (
    <>
      <div className="calendar-page">
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
          <div className="calendar-card">

            {/* ── Sticky top bar ── */}
            <div className="calendar-header">
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
                  <div className="calendar-header-title">Calendar</div>
                )}
              </div>

              <div className="calendar-header-actions">
                {/* Today button */}
                <button
                  className="calendar-today-btn"
                  onClick={scrollToToday}
                  title="Jump to today"
                >
                  Today
                </button>

                {/* Search button */}
                <button
                  className={`calendar-search-btn ${searchOpen ? "calendar-search-btn--active" : ""}`}
                  onClick={handleSearchToggle}
                  title={searchOpen ? "Close search" : "Search events"}
                >
                  {searchOpen ? "✕" : "⌕"}
                </button>
              </div>
            </div>

            {/* ── Scrollable months ── */}
            <div className="calendar-scroll-container" ref={scrollContainerRef}>
              {monthKeys.map(mk => {
                const key = `${mk.year}-${mk.month}`;
                const isCurrentMonth = mk.month === todayKey.month && mk.year === todayKey.year;
                return (
                  <MonthBlock
                    key={key}
                    monthKey={mk}
                    today={today}
                    selected={selected}
                    onSelectDay={handleSelectDay}
                    eventsByDate={eventsByDate}
                    monthRef={el => {
                      if (el) {
                        monthRefs.current.set(key, el);
                        if (isCurrentMonth) todayMonthRef.current = el;
                      }
                    }}
                  />
                );
              })}
            </div>

            {/* ── Event panel ── */}
            {selected && (
              <div className="calendar-event-panel">
                {loading ? (
                  <div className="calendar-event-placeholder">Loading events…</div>
                ) : (
                  <>
                    <div className="calendar-event-date">
                      {selected.day} {MONTHS[selected.month]} {selected.year}
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
                )}
              </div>
            )}

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