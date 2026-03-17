import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { MONTHS, formatDateTimeRange, toLocalDateKey } from "../utils/dates";
import type { Event } from "../utils/types";
import { CATEGORIES, CATEGORY_COLOURS } from "../utils/types";
import { useCalendarEvents } from "../hooks/useCalendarEvents";
import EventDetails from "../components/events/EventDetails";
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

type Props = {
  isLoggedIn: boolean;
  onEditEvent: (event: Event) => void;
  onDeleteEvent?: (event: Event) => void;
  onAddEvent: (date: { day: number; month: number; year: number }) => void;
  searchOpen: boolean;
  onToggleSearch: () => void;
  onScrollToTodayReady: (fn: () => void) => void;
  initialEventId?: string;
  initialEventDate?: Date;
  onEventExpand?: (event: Event | null) => void;
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
          const dayEvents = day ? eventsOnDay(day) : [];
          const colIndex = i % 7;
          const isWeekend = colIndex === 5 || colIndex === 6;
          const cellClass = [
            "calendar-cell",
            !day                   ? "calendar-cell--empty"    : "",
            day && isToday(day)    ? "calendar-cell--today"    : "",
            day && isSelected(day) ? "calendar-cell--selected" : "",
            isWeekend              ? "calendar-cell--weekend"  : "",
          ].filter(Boolean).join(" ");

          const MAX_DOTS = 3;
          const visibleEvents = dayEvents.slice(0, MAX_DOTS);
          const overflow = dayEvents.length - MAX_DOTS;

          return (
            <div
              key={i}
              className={cellClass}
              role={day ? "button" : undefined}
              tabIndex={day ? 0 : undefined}
              aria-label={day ? `${day} ${MONTHS[month]} ${year}${dayEvents.length > 0 ? `, ${dayEvents.length} event${dayEvents.length > 1 ? "s" : ""}` : ""}` : undefined}
              aria-pressed={day ? isSelected(day) : undefined}
              onClick={() => { if (day) onSelectDay(day, month, year); }}
              onKeyDown={e => { if (day && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onSelectDay(day, month, year); } }}
            >
              {day && (
                <>
                  <span className="calendar-day-number">{day}</span>
                  {dayEvents.length > 0 && (
                    <div className="calendar-event-chips">
                      {visibleEvents.map((ev, j) => (
                        <span
                          key={j}
                          className="calendar-event-chip"
                          style={{ background: CATEGORY_COLOURS[ev.category] }}
                        >
                          {ev.title}
                        </span>
                      ))}
                      {overflow > 0 && (
                        <span className="calendar-event-chip-overflow">+{overflow} more</span>
                      )}
                    </div>
                  )}
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

export default function Calendar({ isLoggedIn, onEditEvent, onDeleteEvent, onAddEvent, searchOpen, onToggleSearch, onScrollToTodayReady, initialEventId, initialEventDate, onEventExpand }: Props) {
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

  const [selected, setSelected] = useState<{ day: number; month: number; year: number } | null>(() => {
    if (window.innerWidth <= 700) return null;
    return {
      day: new Date().getDate(),
      month: new Date().getMonth(),
      year: new Date().getFullYear(),
    };
  });
  const [expandedEventId, setExpandedEventId] = useState<string | null>(initialEventId ?? null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const monthRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const todayMonthRef = useRef<HTMLDivElement | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef    = useRef<HTMLDivElement>(null);

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        if (searchOpen) { onToggleSearch(); setSearchQuery(""); }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [searchOpen, onToggleSearch]);

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
    if (window.innerWidth > 700) {
      setSelected({ day: today.getDate(), month: today.getMonth(), year: today.getFullYear() });
    }
  }, [today]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      todayMonthRef.current?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleSearchToggle = useCallback(() => {
    if (searchOpen) { setSearchQuery(""); }
    else { setTimeout(() => searchInputRef.current?.focus(), 50); }
    onToggleSearch();
  }, [searchOpen, onToggleSearch]);

  useEffect(() => {
    onScrollToTodayReady(scrollToToday);
  }, [scrollToToday, onScrollToTodayReady]);

  // Scroll to and select the event's day when initialEventDate arrives (deep-link / browser back)
  useEffect(() => {
    if (!initialEventId || !initialEventDate) return;
    const day = initialEventDate.getDate();
    const month = initialEventDate.getMonth();
    const year = initialEventDate.getFullYear();
    setSelected({ day, month, year });
    setExpandedEventId(initialEventId);
    setTimeout(() => {
      monthRefs.current.get(`${year}-${month}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, [initialEventId, initialEventDate]);


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
    if (searchOpen) onToggleSearch();
    setTimeout(() => {
      monthRefs.current.get(`${targetYear}-${targetMonth}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleSelectDay = (day: number, month: number, year: number) => {
    if (selected?.day === day && selected?.month === month && selected?.year === year) {
      setSelected(null);
      if (expandedEventId) onEventExpand?.(null);
      setExpandedEventId(null);
    } else {
      if (expandedEventId) onEventExpand?.(null);
      setSelected({ day, month, year });
      setExpandedEventId(null);
    }
  };

  const handleToggleEvent = (ev: Event) => {
    setExpandedEventId(prev => {
      const evId = String(ev.id);
      const next = prev === evId ? null : evId;
      onEventExpand?.(next ? ev : null);
      return next;
    });
  };

  const selectedEvents: Event[] = useMemo(() => {
    if (!selected) return [];
    return eventsByDate.get(
      toLocalDateKey(new Date(selected.year, selected.month, selected.day).toISOString())
    ) ?? [];
  }, [selected, eventsByDate]);

  // On mobile the panel always slides up when a day is selected (even empty days show the Add Event button)
  const mobilePanelOpen = selected !== null;

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
                  <div className="calendar-search-dropdown-empty">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <circle cx="11" cy="11" r="8"/>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      <line x1="8" y1="11" x2="14" y2="11"/>
                    </svg>
                    No results for "{searchQuery}"
                  </div>
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

      {/* ── Mobile backdrop — dims calendar behind the panel ── */}
      {mobilePanelOpen && (
        <div className="calendar-backdrop" onClick={() => { if (expandedEventId) onEventExpand?.(null); setSelected(null); setExpandedEventId(null); }} aria-hidden="true" />
      )}

      {/* ── Right: event panel ── */}
      <div className={`calendar-panel ${selected ? "calendar-panel--open" : ""} ${mobilePanelOpen ? "calendar-panel--mobile-open" : ""}`}>

        {!selected ? (
          <div className="calendar-panel-empty">
            <svg className="calendar-panel-empty-icon" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
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
                <button className="calendar-panel-close" onClick={() => { if (expandedEventId) onEventExpand?.(null); setSelected(null); setExpandedEventId(null); }} aria-label="Close">✕</button>
              </div>
            </div>

            {loading ? (
              <div className="calendar-panel-list" style={{ padding: "0.75rem" }}>
                {[1, 2].map(i => (
                  <div key={i} style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--color-border-subtle)" }}>
                    <div className="skeleton" style={{ height: "0.9rem", width: "65%", marginBottom: "0.5rem", borderRadius: "4px" }} />
                    <div className="skeleton" style={{ height: "0.75rem", width: "40%", borderRadius: "4px" }} />
                  </div>
                ))}
              </div>
            ) : selectedEvents.length === 0 ? (
              <div className="calendar-panel-empty">
                <svg className="calendar-panel-empty-icon" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                  <line x1="9" y1="16" x2="15" y2="16"/>
                </svg>
                <p>No events on this day</p>
              </div>
            ) : (
              <div className="calendar-panel-list">
                {selectedEvents.map(ev => {
                  const isExpanded = expandedEventId !== null && String(expandedEventId) === String(ev.id);
                  return (
                    <div key={ev.id} className="calendar-panel-event-wrap">
                      {isExpanded ? (
                        <div className="calendar-panel-event-detail">
                          <EventDetails
                            event={ev}
                            isLoggedIn={isLoggedIn}
                            onClose={() => { setExpandedEventId(null); onEventExpand?.(null); }}
                            onEdit={onEditEvent}
                            onDelete={onDeleteEvent}
                          />
                        </div>
                      ) : (
                        <button
                          className="calendar-panel-event"
                          style={{ borderLeft: `3px solid ${CATEGORY_COLOURS[ev.category]}` }}
                          onClick={() => handleToggleEvent(ev)}
                        >
                          <span className="calendar-panel-event-title">
                            {ev.title}
                          </span>
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

        {/* Always-visible bottom: legend */}
        <div className="calendar-panel-bottom">
          <div className="calendar-panel-legend">
            {CATEGORIES.map(c => (
              <div key={c} className="calendar-panel-legend-item">
                <span className="calendar-panel-legend-dot" style={{ background: CATEGORY_COLOURS[c] }} />
                <span className="calendar-panel-legend-label">{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}