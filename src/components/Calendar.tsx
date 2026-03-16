import { useState, useEffect, useMemo, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { MONTHS, formatDateTimeRange, toLocalDateKey } from "../utils/dates";
import type { Event } from "../utils/types";
import { useCalendarEvents } from "../hooks/useCalendarEvents";
import EventDetails from "./events/EventDetails";
import "./Calendar.css";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SEARCH_RESULT_LIMIT = 10;
const MONTHS_BEFORE_INIT = 2;
const MONTHS_BEFORE_MAX  = 11;
const MONTHS_AFTER_INIT  = 11;
const MONTHS_AFTER_MAX   = 11;

type MonthKey = { month: number; year: number };

function addMonths(base: MonthKey, delta: number): MonthKey {
  let m = base.month + delta;
  let y = base.year;
  while (m > 11) { m -= 12; y++; }
  while (m < 0)  { m += 12; y--; }
  return { month: m, year: y };
}

export type CalendarHandle = {
  scrollToToday: () => void;
  toggleSearch: () => void;
};

type Props = {
  isLoggedIn: boolean;
  onViewEvent: (event: Event) => void;
  onEditEvent: (event: Event) => void;
  onAddEvent: (date: { day: number; month: number; year: number }) => void;
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
  const rawFirstDay = new Date(year, month, 1).getDay(); // 0=Sun…6=Sat
  const firstDay    = (rawFirstDay + 6) % 7;             // 0=Mon…6=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const rawCells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const trailingNulls = (7 - (rawCells.length % 7)) % 7;
  const cells = [...rawCells, ...Array(trailingNulls).fill(null)];

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const isSelected = (day: number) =>
    selected !== null && selected.day === day && selected.month === month && selected.year === year;

  const eventsOnDay = (day: number): Event[] =>
    eventsByDate.get(toLocalDateKey(new Date(year, month, day).toISOString())) ?? [];

  return (
    <div className="calendar-month-block" ref={monthRef} data-month={month} data-year={year}>
      <div className="calendar-month-label">
        <span className="calendar-month-label-name">{MONTHS[month]}</span>
        <span className="calendar-month-label-year">{year}</span>
      </div>
      <div className="calendar-day-labels">
        {DAYS.map(d => (
          <div key={d} className="calendar-day-label">{d}</div>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((day, i) => {
          const count = day ? eventsOnDay(day).length : 0;
          const colIndex = i % 7;
          const isWeekend = colIndex === 5 || colIndex === 6;
          const cellClass = [
            "calendar-cell",
            !day                   ? "calendar-cell--empty"    : "",
            day && isToday(day)    ? "calendar-cell--today"    : "",
            day && isSelected(day) ? "calendar-cell--selected" : "",
            isWeekend              ? "calendar-cell--weekend"  : "",
          ].filter(Boolean).join(" ");

          return (
            <div key={i} className={cellClass} onClick={() => { if (day) onSelectDay(day, month, year); }}>
              {day && (
                <>
                  <span className="calendar-day-number">{day}</span>
                  {count > 0 && <span className="calendar-event-dot" />}
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

const Calendar = forwardRef<CalendarHandle, Props>(function Calendar(
  { isLoggedIn, onEditEvent, onAddEvent },
  ref
) {
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const msUntilMidnight = () => {
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

  const [monthsBefore, setMonthsBefore] = useState(MONTHS_BEFORE_INIT);
  const [monthsAfter,  setMonthsAfter]  = useState(MONTHS_AFTER_INIT);

  const monthKeys: MonthKey[] = useMemo(() => {
    const keys: MonthKey[] = [];
    for (let i = -monthsBefore; i <= monthsAfter; i++) keys.push(addMonths(todayKey, i));
    return keys;
  }, [monthsBefore, monthsAfter, todayKey.month, todayKey.year]);

  const windowStart = monthKeys[0];
  const windowEnd   = monthKeys[monthKeys.length - 1];

  const { eventsByDate, allEvents, loading } = useCalendarEvents(windowStart, windowEnd);

  const [selected, setSelected] = useState<{ day: number; month: number; year: number } | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const monthRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const todayMonthRef = useRef<HTMLDivElement | null>(null);

  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef    = useRef<HTMLDivElement>(null);

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Infinite scroll – load more months when near top/bottom
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop < 200 && monthsBefore < MONTHS_BEFORE_MAX)
        setMonthsBefore(p => Math.min(p + 2, MONTHS_BEFORE_MAX));
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 400 && monthsAfter < MONTHS_AFTER_MAX)
        setMonthsAfter(p => Math.min(p + 2, MONTHS_AFTER_MAX));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [monthsBefore, monthsAfter]);

  const scrollToToday = useCallback(() => {
    todayMonthRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      todayMonthRef.current?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleSearchToggle = useCallback(() => {
    if (searchOpen) { setSearchOpen(false); setSearchQuery(""); }
    else { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); }
  }, [searchOpen]);

  // Expose handles to parent (Navbar via main.tsx)
  useImperativeHandle(ref, () => ({
    scrollToToday,
    toggleSearch: handleSearchToggle,
  }), [scrollToToday, handleSearchToggle]);

  const matchesSearch = useCallback((event: Event, q: string) => {
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
    setTimeout(() => {
      monthRefs.current.get(`${targetYear}-${targetMonth}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleSelectDay = (day: number, month: number, year: number) => {
    if (selected?.day === day && selected?.month === month && selected?.year === year) {
      setSelected(null);
    } else {
      setSelected({ day, month, year });
      setExpandedEventId(null);
    }
  };

  const handleToggleEvent = (ev: Event) => {
    setExpandedEventId(prev => prev === ev.id ? null : ev.id);
  };

  const selectedEvents: Event[] = useMemo(() => {
    if (!selected) return [];
    return eventsByDate.get(
      toLocalDateKey(new Date(selected.year, selected.month, selected.day).toISOString())
    ) ?? [];
  }, [selected, eventsByDate]);

  return (
    <div className="calendar-page">

      {/* ── Left: scrollable calendar ── */}
      <div className="calendar-col">

        {/* Search bar — shown at top of column when open */}
        {searchOpen && (
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
              <button className="calendar-search-close" onClick={handleSearchToggle} title="Close search">✕</button>
            </div>
            {searchQuery.trim().length > 0 && (
              <div className="calendar-search-dropdown">
                {searchResults.length === 0 ? (
                  <div className="calendar-search-dropdown-empty">No matching events</div>
                ) : searchResults.map(ev => (
                  <button key={ev.id} className="calendar-search-result" onClick={() => handleResultClick(ev)}>
                    <span className="calendar-search-result-title">{ev.title}</span>
                    <span className="calendar-search-result-date">{formatDateTimeRange(ev.starts_at, ev.finishes_at)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

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
      </div>

      {/* ── Right: event panel ── */}
      <div className={`calendar-panel ${selected ? "calendar-panel--open" : ""}`}>
        {!selected ? (
          <div className="calendar-panel-empty">
            <span className="calendar-panel-empty-icon">◎</span>
            <p>Select a day to see events</p>
          </div>
        ) : (
          <>
            <div className="calendar-panel-header">
              <div className="calendar-panel-date">
                {selected.day} {MONTHS[selected.month]} {selected.year}
              </div>
              <div className="calendar-panel-header-actions">
                <button
                  className="calendar-panel-add-btn"
                  onClick={() => onAddEvent(selected)}
                  title="Add event on this day"
                >
                  + Add Event
                </button>
                <button className="calendar-panel-close" onClick={() => setSelected(null)} aria-label="Close">✕</button>
              </div>
            </div>

            {loading ? (
              <div className="calendar-panel-empty"><p>Loading…</p></div>
            ) : selectedEvents.length === 0 ? (
              <div className="calendar-panel-empty">
                <span className="calendar-panel-empty-icon">○</span>
                <p>No events on this day</p>
              </div>
            ) : (
              <div className="calendar-panel-list">
                {selectedEvents.map(ev => {
                  const isExpanded = expandedEventId === ev.id;
                  return (
                    <div key={ev.id} className="calendar-panel-event-wrap">
                      {isExpanded ? (
                        <div className="calendar-panel-event-detail">
                          <EventDetails
                            event={ev}
                            isLoggedIn={isLoggedIn}
                            onClose={() => setExpandedEventId(null)}
                            onEdit={onEditEvent}
                          />
                        </div>
                      ) : (
                        <button
                          className="calendar-panel-event"
                          onClick={() => handleToggleEvent(ev)}
                        >
                          <span className="calendar-panel-event-title">{ev.title}</span>
                          <span className="calendar-panel-event-time">
                            {new Date(ev.starts_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                            {ev.finishes_at && ` – ${new Date(ev.finishes_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`}
                          </span>
                          {ev.location && <span className="calendar-panel-event-location">📍 {ev.location}</span>}
                          <span className="calendar-panel-event-chevron">▶</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
});

export default Calendar;