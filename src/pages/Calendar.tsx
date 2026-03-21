import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { MONTHS, formatDateTimeRange, toLocalDateKey } from "../utils/dates";
import type { Event } from "../utils/types";
import { CATEGORY_COLOURS, isLightColor } from "../utils/types";
import { useCalendarEvents } from "../hooks/useCalendarEvents";
import { useFilters } from "../hooks/useFilters";
import { passesDateFilter, passesDistanceFilter, matchesSearch } from "../utils/eventFilters";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useClickOutside } from "../hooks/useClickOutside";
import { useInView } from "../hooks/useInView";
import FilterPanel from "../components/FilterPanel";
import MobileFilterBar from "../components/MobileFilterBar";
import SearchBar from "../components/SearchBar";
import ViewSwitcher from "../components/ViewSwitcher";
import "./Calendar.css";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SEARCH_RESULT_LIMIT = 10;

// Persists scroll position across unmount/remount (e.g. when viewing an event and returning)
let persistedScrollTop: number | null = null;
// When the user opens an event from the calendar, store its month so we scroll there on return
let persistedTargetMonthKey: string | null = null;

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
  onAddEvent: (date: { day: number; month: number; year: number }) => void;
  onViewEvent: (event: Event) => void;
  onNavigate: (view: "list" | "map") => void;
  searchOpen: boolean;
  onToggleSearch: () => void;
  onScrollToTodayReady: (fn: () => void) => void;
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
  const { ref: inViewRef, isInView } = useInView({ threshold: 0.05, rootMargin: "0px 0px -30px 0px" });
  const rawFirstDay = new Date(year, month, 1).getDay(); // 0=Sun…6=Sat
  const firstDay    = (rawFirstDay + 6) % 7;             // 0=Mon…6=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const rawCells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const trailingNulls = (7 - (rawCells.length % 7)) % 7;
  const cells = [...rawCells, ...Array(trailingNulls).fill(null)];

  const isCompact = window.innerWidth <= 700 ||
    (window.innerWidth <= 900 && window.innerHeight <= 500);
  const MAX_CHIPS = isCompact ? 2 : 3;
  const MAX_DOTS  = isCompact ? 3 : 4;

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const isSelected = (day: number) =>
    selected !== null && selected.day === day && selected.month === month && selected.year === year;

  const eventsOnDay = (day: number): Event[] =>
    eventsByDate.get(toLocalDateKey(new Date(year, month, day).toISOString())) ?? [];

  // Merge the IntersectionObserver ref with the parent's callback ref
  const combinedRef = useCallback((el: HTMLDivElement | null) => {
    inViewRef(el);
    monthRef?.(el);
  }, [inViewRef, monthRef]);

  return (
    <div className={`calendar-month-block${isInView ? " in-view" : ""}`} ref={combinedRef} data-month={month} data-year={year}>
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

          const chipEvents    = dayEvents.slice(0, MAX_CHIPS);
          const dotEvents     = dayEvents.slice(MAX_CHIPS, MAX_CHIPS + MAX_DOTS);
          const overflowCount = Math.max(0, dayEvents.length - MAX_CHIPS - MAX_DOTS);

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
                      {chipEvents.map(ev => (
                        <span
                          key={ev.id}
                          className="calendar-event-chip"
                          style={{
                            background: CATEGORY_COLOURS[ev.category],
                            color: isLightColor(CATEGORY_COLOURS[ev.category]) ? "#1e293b" : "#fff",
                          }}
                        >
                          {ev.title}
                        </span>
                      ))}
                      {(dotEvents.length > 0 || overflowCount > 0) && (
                        <div className="calendar-event-dots">
                          {dotEvents.map(ev => (
                            <span
                              key={ev.id}
                              className="calendar-event-dot"
                              role="img"
                              aria-label={ev.title}
                              style={{ background: CATEGORY_COLOURS[ev.category] }}
                            />
                          ))}
                          {overflowCount > 0 && (
                            <span className="calendar-event-chip-overflow">+{overflowCount}</span>
                          )}
                        </div>
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

export default function Calendar({ onAddEvent, onViewEvent, onNavigate, searchOpen, onToggleSearch, onScrollToTodayReady }: Props) {
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

  const { selectedCategories, dateFilter, setDateFilter, toggleCategory, clearCategories, distanceFilter, setDistanceFilter, clearDistanceFilter } = useFilters();

  const { eventsByDate: rawEventsByDate, allEvents, loading, error: fetchError, retry } = useCalendarEvents(windowStart, windowEnd);

  const eventsByDate = useMemo(() => {
    if (selectedCategories.size === 0 && dateFilter === "all" && distanceFilter === null) return rawEventsByDate;
    const filtered = new Map<string, Event[]>();
    for (const [key, evs] of rawEventsByDate) {
      const kept = evs.filter(ev =>
        (selectedCategories.size === 0 || selectedCategories.has(ev.category)) &&
        passesDateFilter(ev, dateFilter) &&
        (distanceFilter === null || passesDistanceFilter(ev, distanceFilter.center, distanceFilter.radiusMiles))
      );
      if (kept.length > 0) filtered.set(key, kept);
    }
    return filtered;
  }, [rawEventsByDate, selectedCategories, dateFilter, distanceFilter]);

  const [selected, setSelected] = useState<{ day: number; month: number; year: number } | null>(() => {
    if (window.innerWidth <= 700) return null;
    return {
      day: new Date().getDate(),
      month: new Date().getMonth(),
      year: new Date().getFullYear(),
    };
  });
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const monthRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const todayMonthRef = useRef<HTMLDivElement | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef    = useRef<HTMLDivElement>(null);
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);

  // Close search dropdown on outside click
  const closeSearch = useCallback(() => {
    if (searchOpen) { onToggleSearch(); setSearchQuery(""); }
  }, [searchOpen, onToggleSearch]);
  useClickOutside(dropdownRef, closeSearch, searchOpen);

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
    // On mobile, only scroll — don't open the day panel as it covers the screen
    if (window.innerWidth > 700) {
      setSelected({ day: today.getDate(), month: today.getMonth(), year: today.getFullYear() });
    }
  }, [today]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    const frame = requestAnimationFrame(() => {
      if (persistedTargetMonthKey !== null) {
        const target = persistedTargetMonthKey;
        persistedTargetMonthKey = null;
        monthRefs.current.get(target)?.scrollIntoView({ block: "start" });
      } else if (persistedScrollTop !== null && el) {
        el.scrollTop = persistedScrollTop;
        persistedScrollTop = null;
      } else {
        todayMonthRef.current?.scrollIntoView({ block: "start" });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Save scroll position when Calendar unmounts (e.g. navigating to event view)
  useEffect(() => {
    return () => {
      if (scrollContainerRef.current) {
        persistedScrollTop = scrollContainerRef.current.scrollTop;
      }
    };
  }, []);

  const handleViewEvent = useCallback((ev: Event) => {
    const d = new Date(ev.starts_at);
    persistedTargetMonthKey = `${d.getFullYear()}-${d.getMonth()}`;
    persistedScrollTop = null;
    onViewEvent(ev);
  }, [onViewEvent]);

  const handleSearchToggle = useCallback(() => {
    if (searchOpen) { setSearchQuery(""); }
    else { setTimeout(() => searchInputRef.current?.focus(), 50); }
    onToggleSearch();
  }, [searchOpen, onToggleSearch]);

  useEffect(() => {
    onScrollToTodayReady(scrollToToday);
  }, [scrollToToday, onScrollToTodayReady]);

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 200);
  const isSearchPending = searchQuery.trim() !== debouncedSearchQuery.trim();

  const searchResults = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return [];
    const matches: Event[] = [];
    for (const e of allEvents) {
      if (matchesSearch(e, debouncedSearchQuery)) {
        matches.push(e);
        if (matches.length === SEARCH_RESULT_LIMIT) break;
      }
    }
    return matches;
  }, [debouncedSearchQuery, allEvents]);

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
    } else {
      setSelected({ day, month, year });
    }
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

      {fetchError && (
        <div className="calendar-error-banner" role="alert">
          Failed to load events.{" "}
          <button className="calendar-error-retry" onClick={retry}>Retry</button>
        </div>
      )}

      {/* ── Left: scrollable calendar ── */}
      <div className="calendar-col">

        {/* Mobile view switcher */}
        <ViewSwitcher activeView="calendar" onNavigate={v => { if (v !== "calendar") onNavigate(v); }} onToday={scrollToToday} onSearch={handleSearchToggle} />

        {/* Search bar — shown at top of column when open */}
        {searchOpen && (
          <SearchBar
            wrapperClassName="calendar-search-wrap"
            value={searchQuery}
            onChange={setSearchQuery}
            onClose={handleSearchToggle}
            inputRef={searchInputRef}
            wrapRef={dropdownRef}
          >
            {searchQuery.trim().length > 0 && (
              <div className="calendar-search-dropdown">
                {isSearchPending ? (
                  <div className="calendar-search-dropdown-empty">
                    <span className="location-search-spinner" aria-hidden="true" />
                    Searching…
                  </div>
                ) : searchResults.length === 0 ? (
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
          </SearchBar>
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
                  } else {
                    monthRefs.current.delete(key);
                  }
                }}
              />
            );
          })}
        </div>
      </div>

      {/* ── Mobile backdrop — dims calendar behind the panel ── */}
      {mobilePanelOpen && (
        <div className="calendar-backdrop" onClick={() => setSelected(null)} aria-hidden="true" />
      )}

      {/* ── Right: event panel ── */}
      <div className={`calendar-panel ${selected ? "calendar-panel--open" : ""} ${mobilePanelOpen ? "calendar-panel--mobile-open" : ""}`}>

        {/* Desktop view switcher — above filters in right panel */}
        <ViewSwitcher
          className="calendar-panel-view-switcher"
          activeView="calendar"
          onNavigate={v => { if (v !== "calendar") onNavigate(v); }}
          onToday={scrollToToday}
          onSearch={handleSearchToggle}
        />

        {/* Desktop filter toggle — top of panel column */}
        <div className={`calendar-panel-filters${filtersCollapsed ? " calendar-panel-filters--collapsed" : ""}`}>
          <button className="calendar-panel-filter-toggle" onClick={() => setFiltersCollapsed(c => !c)} aria-expanded={!filtersCollapsed}>
            <span className="calendar-panel-filter-toggle-label">Filters</span>
            <span className="calendar-panel-filter-toggle-arrow">{filtersCollapsed ? "▶" : "▼"}</span>
          </button>
          {!filtersCollapsed && (
            <FilterPanel
              selectedCategories={selectedCategories}
              onToggleCategory={toggleCategory}
              onClearCategories={clearCategories}
              dateFilter={dateFilter}
              onSetDateFilter={setDateFilter}
              distanceFilter={distanceFilter}
              onSetDistanceFilter={setDistanceFilter}
              onClearDistanceFilter={clearDistanceFilter}
            />
          )}
        </div>

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
                <button className="calendar-panel-close" onClick={() => setSelected(null)} aria-label="Close">✕</button>
              </div>
            </div>

            {loading ? (
              <div className="calendar-panel-list" style={{ padding: "0.75rem" }}>
                {[1, 2].map(i => (
                  <div key={i} style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--color-border-subtle)" }}>
                    <div className="skeleton skeleton-md skeleton-mb" style={{ width: "65%" }} />
                    <div className="skeleton skeleton-sm" style={{ width: "40%" }} />
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
                {selectedEvents.map(ev => (
                  <div key={ev.id} className="calendar-panel-event-wrap">
                    <button
                      className="calendar-panel-event"
                      style={{ borderLeft: `3px solid ${CATEGORY_COLOURS[ev.category]}` }}
                      onClick={() => handleViewEvent(ev)}
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
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>

      {/* ── Mobile-only filter bar — fixed bottom ── */}
      <MobileFilterBar collapsed={filtersCollapsed} onToggle={() => setFiltersCollapsed(c => !c)}>
        <FilterPanel
          selectedCategories={selectedCategories}
          onToggleCategory={toggleCategory}
          onClearCategories={clearCategories}
          dateFilter={dateFilter}
          onSetDateFilter={setDateFilter}
          distanceFilter={distanceFilter}
          onSetDistanceFilter={setDistanceFilter}
          onClearDistanceFilter={clearDistanceFilter}
        />
      </MobileFilterBar>

    </div>
  );
}