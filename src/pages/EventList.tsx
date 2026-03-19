import { useState, useEffect, useRef, useCallback } from "react";
import type { Event } from "../utils/types";
import { CATEGORIES, CATEGORY_COLOURS } from "../utils/types";
import { MONTHS, formatDateTimeRange } from "../utils/dates";
import { useFilters } from "../hooks/useFilters";
import { useUpcomingEvents } from "../hooks/useUpcomingEvents";
import { passesDateFilter, matchesSearch, DATE_FILTER_LABELS } from "../utils/eventFilters";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

import { useClickOutside } from "../hooks/useClickOutside";
import { useInView } from "../hooks/useInView";
import FilterPanel from "../components/FilterPanel";
import "./EventList.css";

type Props = {
  onViewEvent: (event: Event) => void;
  searchOpen?: boolean;
  onToggleSearch?: () => void;
};

type MonthGroup = {
  label: string;
  events: Event[];
};

function groupByMonth(events: Event[]): MonthGroup[] {
  const groups = new Map<string, Event[]>();
  for (const ev of events) {
    const d = new Date(ev.starts_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ev);
  }
  return Array.from(groups.entries()).map(([key, evs]) => {
    const [year, month] = key.split("-").map(Number);
    return { label: `${MONTHS[month]} ${year}`, events: evs };
  });
}

function MonthSection({ group, onViewEvent }: { group: MonthGroup; onViewEvent: (event: Event) => void }) {
  const { ref, isInView } = useInView({ threshold: 0.05 });
  return (
    <section ref={ref as React.Ref<HTMLElement>} className={`event-list-month${isInView ? " in-view" : ""}`}>
      <h2 className="event-list-month-heading">{group.label}</h2>
      <div className="event-list-items">
        {group.events.map(ev => (
          <div key={ev.id} className="event-list-item-wrap">
            <button
              className="event-list-item"
              onClick={() => onViewEvent(ev)}
            >
              <span
                className="event-list-dot"
                style={{ background: CATEGORY_COLOURS[ev.category] }}
                aria-hidden="true"
              />
              <span className="sr-only">{ev.category}</span>
              <span className="event-list-title">{ev.title}</span>
              <span className="event-list-time">{formatDateTimeRange(ev.starts_at, ev.finishes_at)}</span>
              {ev.location && (
                <span className="event-list-location">📍 {ev.location}</span>
              )}
              <span className="event-list-chevron">▶</span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function EventList({ onViewEvent, searchOpen, onToggleSearch }: Props) {
  const [showPast, setShowPast] = useState(false);
  const { events, loading, error } = useUpcomingEvents(showPast);
  const { selectedCategories, dateFilter, setDateFilter, toggleCategory, clearCategories } = useFilters();

  function switchTimeline(past: boolean) {
    setShowPast(past);
    setDateFilter("all");
  }
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  // Focus input when search opens; clear query when it closes
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
    else setSearchQuery("");
  }, [searchOpen]);

  // Close search on outside click
  const closeSearch = useCallback(() => {
    if (searchOpen) { onToggleSearch?.(); setSearchQuery(""); }
  }, [searchOpen, onToggleSearch]);
  useClickOutside(searchWrapRef, closeSearch, searchOpen);

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 200);

  const visibleEvents = events.filter(ev =>
    matchesSearch(ev, debouncedSearchQuery) &&
    (selectedCategories.size === 0 || selectedCategories.has(ev.category)) &&
    passesDateFilter(ev, dateFilter)
  );
  const groups = groupByMonth(visibleEvents);

  return (
    <div className="event-list-page">

      {/* Search bar — shown at top when open */}
      {searchOpen && (
        <div className="event-list-search-wrap" ref={searchWrapRef}>
          <div className="event-list-search-bar">
            <span className="event-list-search-icon">⌕</span>
            <input
              ref={searchInputRef}
              className="event-list-search-input"
              type="text"
              placeholder="Search events…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Escape" && onToggleSearch?.()}
            />
            <button className="event-list-search-close" onClick={() => { onToggleSearch?.(); }} title="Close search">✕</button>
          </div>
        </div>
      )}

      <div className="event-list-layout">

        {/* Mobile-only filter panel — hidden at 860px+ where sidebar takes over */}
        <div className={`event-list-mobile-filters${filtersCollapsed ? " event-list-mobile-filters--collapsed" : ""}`}>
          <button
            className="event-list-filter-toggle"
            onClick={() => setFiltersCollapsed(c => !c)}
            aria-expanded={!filtersCollapsed}
          >
            <span className="event-list-filter-toggle-label">Filters</span>
            <span className="event-list-filter-toggle-arrow">{filtersCollapsed ? "▲" : "▼"}</span>
          </button>
          <FilterPanel
            selectedCategories={selectedCategories}
            onToggleCategory={toggleCategory}
            onClearCategories={clearCategories}
            dateFilter={dateFilter}
            onSetDateFilter={setDateFilter}
            compact={filtersCollapsed}
          />
        </div>

        {/* Events column — LEFT on desktop */}
        <div className="event-list-container">
          <div className="event-list-items-col">
            <div className="event-list-timeline-toggle">
              <button
                className={`event-list-timeline-btn${!showPast ? " event-list-timeline-btn--active" : ""}`}
                onClick={() => switchTimeline(false)}
              >
                Upcoming
              </button>
              <button
                className={`event-list-timeline-btn${showPast ? " event-list-timeline-btn--active" : ""}`}
                onClick={() => switchTimeline(true)}
              >
                Past
              </button>
            </div>
            {error ? (
            <div className="form-error" role="alert">{error}</div>
          ) : loading ? (
              <div className="event-list-loading">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="event-list-skeleton" />
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className="event-list-empty">
                {selectedCategories.size > 0 || dateFilter !== "all"
                  ? "No events match your current filters."
                  : showPast ? "No past events found." : "No upcoming events found."}
              </div>
            ) : (
              groups.map(group => (
                <MonthSection key={group.label} group={group} onViewEvent={onViewEvent} />
              ))
            )}
          </div>
        </div>

        {/* Sidebar — RIGHT on desktop, hidden on mobile */}
        <aside className="event-list-sidebar">
          {!showPast && (
            <>
              <div className="event-list-sidebar-title">When</div>
              {(["all", "week", "weekend", "month"] as const).map(f => (
                <button
                  key={f}
                  className={`category-filter-btn${dateFilter === f ? " category-filter-btn--selected" : ""}`}
                  onClick={() => setDateFilter(f)}
                >
                  {DATE_FILTER_LABELS[f]}
                </button>
              ))}
            </>
          )}
          <div className="event-list-sidebar-title event-list-sidebar-title--section">Categories</div>
          <button
            className={`category-filter-btn${selectedCategories.size === 0 ? " category-filter-btn--selected" : ""}`}
            onClick={clearCategories}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`category-filter-btn${selectedCategories.has(cat) ? " category-filter-btn--selected" : ""}`}
              onClick={() => toggleCategory(cat)}
            >
              <span
                className="category-dot"
                style={{ background: CATEGORY_COLOURS[cat] }}
              />
              <span className="category-filter-label">{cat}</span>
            </button>
          ))}
        </aside>

      </div>
    </div>
  );
}
