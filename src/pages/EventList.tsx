import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import type { Event } from "../utils/types";
import { CATEGORIES, CATEGORY_COLOURS } from "../utils/types";
import { MONTHS, formatDateTimeRange } from "../utils/dates";
import { useFilters } from "../hooks/useFilters";
import { passesDateFilter, matchesSearch, DATE_FILTER_LABELS } from "../utils/eventFilters";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

import EventDetailCard from "../components/events/EventDetails";
import FilterPanel from "../components/FilterPanel";
import "./EventList.css";

type Props = {
  isLoggedIn: boolean;
  onEditEvent: (event: Event) => void;
  onDeleteEvent?: (event: Event) => void;
  onDuplicateEvent?: (event: Event) => void;
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

export default function EventList({ isLoggedIn, onEditEvent, onDeleteEvent, onDuplicateEvent, searchOpen, onToggleSearch }: Props) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { selectedCategories, dateFilter, setDateFilter, toggleCategory, clearCategories } = useFilters();
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isCurrent = true;
    const now = new Date();
    const end = new Date(now);
    end.setFullYear(end.getFullYear() + 1);

    supabase
      .from("events")
      .select("*")
      .eq("approved", true)
      .gte("starts_at", now.toISOString())
      .lte("starts_at", end.toISOString())
      .order("starts_at", { ascending: true })
      .then(({ data, error }) => {
        if (!isCurrent) return;
        if (error) {
          setError(error.message);
        } else {
          setEvents(data || []);
        }
        setLoading(false);
      });

    return () => { isCurrent = false; };
  }, []);

  // Focus input when search opens; clear query when it closes
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
    else setSearchQuery("");
  }, [searchOpen]);

  // Close search on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        if (searchOpen) { onToggleSearch?.(); setSearchQuery(""); }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [searchOpen, onToggleSearch]);

  function toggleExpand(id: number) {
    setExpandedId(prev => (prev === id ? null : id));
  }

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 200);

  const visibleEvents = events.filter(ev =>
    matchesSearch(ev, debouncedSearchQuery) &&
    (selectedCategories.size === 0 || selectedCategories.has(ev.category)) &&
    passesDateFilter(ev, dateFilter)
  );
  const groups = groupByMonth(visibleEvents);
  const expandedEvent = expandedId !== null ? events.find(e => e.id === expandedId) ?? null : null;

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
        <div className={`event-list-container${expandedId !== null ? " event-list-container--split" : ""}`}>
          <div className="event-list-items-col">
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
                  : "No upcoming events found."}
              </div>
            ) : (
              groups.map(group => (
                <section key={group.label} className="event-list-month">
                  <h2 className="event-list-month-heading">{group.label}</h2>
                  <div className="event-list-items">
                    {group.events.map(ev => (
                      <div key={ev.id} className="event-list-item-wrap">
                        <button
                          className={`event-list-item${expandedId === ev.id ? " event-list-item--expanded" : ""}`}
                          onClick={() => toggleExpand(ev.id)}
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
                          <span className="event-list-chevron">{expandedId === ev.id ? "▼" : "▶"}</span>
                        </button>
                        {expandedId === ev.id && (
                          <div className="event-list-detail event-list-detail--mobile">
                            <EventDetailCard
                              event={ev}
                              isLoggedIn={isLoggedIn}
                              onClose={() => setExpandedId(null)}
                              onEdit={onEditEvent}
                              onDelete={onDeleteEvent}
                              onDuplicate={onDuplicateEvent}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>

          {expandedEvent && (
            <div className="event-list-detail-panel">
              <EventDetailCard
                event={expandedEvent}
                isLoggedIn={isLoggedIn}
                onClose={() => setExpandedId(null)}
                onEdit={onEditEvent}
                onDelete={onDeleteEvent}
                onDuplicate={onDuplicateEvent}
              />
            </div>
          )}
        </div>

        {/* Sidebar — RIGHT on desktop, hidden on mobile */}
        <aside className="event-list-sidebar">
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
