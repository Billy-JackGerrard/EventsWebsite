import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import type { Event } from "../utils/types";
import { CATEGORY_COLOURS } from "../utils/types";
import { MONTHS, formatDateTimeRange } from "../utils/dates";
import { useFilters } from "../hooks/useFilters";
import { useUpcomingEvents } from "../hooks/useUpcomingEvents";
import { passesDateFilter, passesDistanceFilter, matchesSearch } from "../utils/eventFilters";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useClickOutside } from "../hooks/useClickOutside";
import { useInView } from "../hooks/useInView";
import FilterPanel from "../components/FilterPanel";
import MobileFilterBar from "../components/MobileFilterBar";
import SearchBar from "../components/SearchBar";
import ViewSwitcher from "../components/ViewSwitcher";
import { fadeSlideUp, staggerContainer, scaleSpring } from "../utils/motion";
import "./EventList.css";

type Props = {
  onViewEvent: (event: Event) => void;
  onNavigate?: (view: "calendar" | "list" | "map") => void;
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
      <motion.div
        className="event-list-items"
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
      >
        {group.events.map(ev => (
          <motion.div key={ev.id} className="event-list-item-wrap" variants={fadeSlideUp}>
            <motion.button
              className="event-list-item"
              onClick={() => onViewEvent(ev)}
              whileHover={scaleSpring.hover}
              whileTap={scaleSpring.tap}
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
            </motion.button>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

export default function EventList({ onViewEvent, onNavigate, searchOpen, onToggleSearch }: Props) {
  useEffect(() => { window.scrollTo({ top: 0 }); }, []);

  const [showPast, setShowPast] = useState(false);
  const { events, loading, error } = useUpcomingEvents(showPast);
  const { selectedCategories, dateFilter, setDateFilter, toggleCategory, clearCategories, distanceFilter, setDistanceFilter, clearDistanceFilter } = useFilters();

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
    passesDateFilter(ev, dateFilter) &&
    (distanceFilter === null || passesDistanceFilter(ev, distanceFilter.center, distanceFilter.radiusMiles))
  );
  const groups = groupByMonth(visibleEvents);

  const excludedByDistanceCount = distanceFilter === null ? 0 : events.filter(ev =>
    matchesSearch(ev, debouncedSearchQuery) &&
    (selectedCategories.size === 0 || selectedCategories.has(ev.category)) &&
    passesDateFilter(ev, dateFilter) &&
    (ev.latitude == null || ev.longitude == null)
  ).length;

  return (
    <div className="event-list-page">

      {/* Mobile view switcher */}
      <ViewSwitcher
        activeView="list"
        onNavigate={v => onNavigate?.(v)}
        onToday={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        onSearch={onToggleSearch}
        className="event-list-view-switcher"
      />

      {/* Search bar — shown at top when open */}
      {searchOpen && (
        <SearchBar
          wrapperClassName="event-list-search-wrap"
          value={searchQuery}
          onChange={setSearchQuery}
          onClose={() => onToggleSearch?.()}
          inputRef={searchInputRef}
          wrapRef={searchWrapRef}
        />
      )}

      <div className="event-list-layout">

        {/* Mobile-only filter panel — hidden at 860px+ where sidebar takes over */}
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
                {selectedCategories.size > 0 || dateFilter !== "all" || distanceFilter !== null
                  ? "No events match your current filters."
                  : showPast ? "No past events found." : "No upcoming events found."}
              </div>
            ) : (
              <>
                {groups.map(group => (
                  <MonthSection key={group.label} group={group} onViewEvent={onViewEvent} />
                ))}
                {excludedByDistanceCount > 0 && (
                  <p className="filter-panel-distance-notice">
                    {excludedByDistanceCount} event{excludedByDistanceCount !== 1 ? "s" : ""} without a map location {excludedByDistanceCount !== 1 ? "are" : "is"} hidden by the distance filter.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sidebar — RIGHT on desktop, hidden on mobile */}
        <aside className="event-list-sidebar">
          <ViewSwitcher
            className="event-list-sidebar-switcher"
            activeView="list"
            onNavigate={v => onNavigate?.(v)}
            onToday={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            onSearch={onToggleSearch}
          />
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
        </aside>

      </div>
    </div>
  );
}
