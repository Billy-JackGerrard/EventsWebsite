import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "../supabaseClient";
import { useFilters } from "../hooks/useFilters";
import { useClickOutside } from "../hooks/useClickOutside";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import FilterPanel from "../components/FilterPanel";
import MobileFilterBar from "../components/MobileFilterBar";
import SearchBar from "../components/SearchBar";
import ViewSwitcher from "../components/ViewSwitcher";
import { MONTHS, formatDate, formatTime } from "../utils/dates";
import { passesDateFilter, passesDistanceFilter, matchesSearch } from "../utils/eventFilters";
import type { Event, Category } from "../utils/types";
import { CATEGORY_COLOURS, isLightColor } from "../utils/types";
import "./MapView.css";

const EDINBURGH_CENTER: L.LatLngTuple = [55.9533, -3.1883];
const DEFAULT_ZOOM = 13;
const CIRCLE_COLOR = "#8b5cf6";

type Props = {
  onViewEvent: (event: Event) => void;
  onNavigate?: (view: "calendar" | "list" | "map") => void;
  searchOpen?: boolean;
  onToggleSearch?: () => void;
};

/** Approved events ordered by start time. */
const approvedEvents = () =>
  supabase.from("events").select("*").eq("approved", true).order("starts_at", { ascending: true });

/** SVG pin matching the Google Maps teardrop style. */
function pinSvg(fill: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42" class="map-pin-svg">` +
    `<defs><filter id="s" x="-20%" y="-10%" width="140%" height="130%">` +
    `<feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-opacity="0.35"/></filter></defs>` +
    `<path filter="url(#s)" fill="${fill}" d="M15 0.5C7 0.5 0.5 7 0.5 15c0 10.5 14.5 26 14.5 26s14.5-15.5 14.5-26C29.5 7 23 0.5 15 0.5z"/>` +
    `<circle cx="15" cy="14.5" r="8.5" fill="#fff" opacity="0.95"/>` +
    `</svg>`;
}

/** Create a Google Maps-style pin icon for a category. */
function categoryIcon(category: Category): L.DivIcon {
  const color = CATEGORY_COLOURS[category];
  return L.divIcon({
    className: "map-marker",
    html: pinSvg(color),
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -38],
  });
}

/** Neutral icon for venues with mixed categories. */
const mixedIcon = L.divIcon({
  className: "map-marker",
  html: pinSvg("#6366f1"),
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  popupAnchor: [0, -38],
});

/** Group events by their lat,lng coordinate pair. */
function groupByLocation(events: Event[]): Map<string, Event[]> {
  const groups = new Map<string, Event[]>();
  for (const e of events) {
    if (e.latitude == null || e.longitude == null) continue;
    const key = `${e.latitude},${e.longitude}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  return groups;
}

export default function MapView({ onViewEvent, onNavigate, searchOpen, onToggleSearch }: Props) {
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const { selectedCategories, dateFilter, setDateFilter, toggleCategory, clearCategories, distanceFilter, setDistanceFilter, clearDistanceFilter } = useFilters();

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

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup>(L.layerGroup());
  const circleLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const prevCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  // Store callback ref so popup click handlers always access the latest onViewEvent
  const onViewEventRef = useRef(onViewEvent);
  onViewEventRef.current = onViewEvent;

  // Fetch events for the selected month
  useEffect(() => {
    let isCurrent = true;
    setLoading(true);
    setError(null);

    const fetchEvents = async () => {
      const from = new Date(viewYear, viewMonth, 1);
      const to = new Date(viewYear, viewMonth + 1, 0, 23, 59, 59, 999);

      const { data, error: fetchError } = await approvedEvents()
        .or(
          `and(starts_at.gte.${from.toISOString()},starts_at.lte.${to.toISOString()}),` +
          `and(starts_at.lt.${from.toISOString()},finishes_at.gte.${from.toISOString()})`
        );

      if (!isCurrent) return;
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setEvents(data || []);
      }
      setLoading(false);
    };

    fetchEvents();
    return () => { isCurrent = false; };
  }, [viewMonth, viewYear, retryCount]);

  // Filter events client-side
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (e.latitude == null || e.longitude == null) return false;
      if (selectedCategories.size > 0 && !selectedCategories.has(e.category)) return false;
      if (!passesDateFilter(e, dateFilter)) return false;
      if (distanceFilter !== null && !passesDistanceFilter(e, distanceFilter.center, distanceFilter.radiusMiles)) return false;
      if (!matchesSearch(e, debouncedSearchQuery)) return false;
      return true;
    });
  }, [events, selectedCategories, dateFilter, distanceFilter, debouncedSearchQuery]);

  // Count online-only events (no coordinates)
  const onlineCount = useMemo(() => {
    return events.filter(e => e.latitude == null || e.longitude == null).length;
  }, [events]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: EDINBURGH_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    markersRef.current.addTo(map);
    circleLayerRef.current.addTo(map);
    mapRef.current = map;

    // Leaflet calculates tile coverage from the container size at init.
    // The flex layout may not have settled yet, so watch for resize and
    // tell Leaflet to recalculate.
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(mapContainerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Render markers when filtered events change
  useEffect(() => {
    const layerGroup = markersRef.current;
    layerGroup.clearLayers();

    const groups = groupByLocation(filteredEvents);

    groups.forEach((eventsAtLocation, key) => {
      const [lat, lng] = key.split(",").map(Number);

      // Pick icon: single category → category color, mixed → neutral
      const categories = new Set(eventsAtLocation.map(e => e.category));
      const icon = categories.size === 1
        ? categoryIcon(eventsAtLocation[0].category)
        : mixedIcon;

      const marker = L.marker([lat, lng], { icon });

      // Build popup HTML
      const venueName = eventsAtLocation[0].location || "Unknown venue";
      const eventItems = eventsAtLocation.map((e, i) => {
        const color = CATEGORY_COLOURS[e.category];
        const textColor = isLightColor(color) ? "#1e293b" : "#fff";
        return `
          <div class="map-popup-event" data-event-index="${i}">
            <span class="map-popup-cat" style="background:${color};color:${textColor}">${e.category}</span>
            <div class="map-popup-title">${escapeHtml(e.title)}</div>
            <div class="map-popup-time">${formatDate(e.starts_at)} &middot; ${formatTime(e.starts_at)}</div>
            <button class="map-popup-btn" data-event-index="${i}">View details</button>
          </div>
        `;
      }).join("");

      const popupHtml = `
        <div class="map-popup">
          <div class="map-popup-venue">${escapeHtml(venueName)}</div>
          ${eventItems}
        </div>
      `;

      const popup = L.popup({ maxWidth: 280, minWidth: 200 }).setContent(popupHtml);
      marker.bindPopup(popup);

      // Wire "View details" buttons via event delegation on popup open
      marker.on("popupopen", () => {
        const container = popup.getElement();
        if (!container) return;
        container.addEventListener("click", (ev) => {
          const btn = (ev.target as HTMLElement).closest<HTMLElement>(".map-popup-btn");
          if (!btn) return;
          const idx = Number(btn.dataset.eventIndex);
          const event = eventsAtLocation[idx];
          if (event) onViewEventRef.current(event);
        });
      });

      layerGroup.addLayer(marker);
    });
  }, [filteredEvents]);

  // Distance circle overlay + auto-center when filter changes
  useEffect(() => {
    const circleLayer = circleLayerRef.current;
    const map = mapRef.current;
    circleLayer.clearLayers();

    if (!distanceFilter || !map) {
      prevCenterRef.current = null;
      return;
    }

    const { center, radiusMiles } = distanceFilter;
    const circle = L.circle([center.lat, center.lng], {
      radius: radiusMiles * 1609.344,
      color: CIRCLE_COLOR,
      fillColor: CIRCLE_COLOR,
      fillOpacity: 0.08,
      weight: 2,
      opacity: 0.5,
      dashArray: "8, 5",
    });
    circleLayer.addLayer(circle);

    // Fly to fit the circle when center changes
    const prev = prevCenterRef.current;
    if (!prev || prev.lat !== center.lat || prev.lng !== center.lng) {
      map.fitBounds(circle.getBounds(), { padding: [24, 24], maxZoom: 14 });
    }
    prevCenterRef.current = center;
  }, [distanceFilter]);

  // Month navigation
  const goToPrevMonth = useCallback(() => {
    setViewMonth(m => {
      if (m === 0) { setViewYear(y => y - 1); return 11; }
      return m - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setViewMonth(m => {
      if (m === 11) { setViewYear(y => y + 1); return 0; }
      return m + 1;
    });
  }, []);

  const goToHome = useCallback(() => {
    if (!navigator.geolocation) {
      mapRef.current?.setView(EDINBURGH_CENTER, DEFAULT_ZOOM);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 14);
      },
      () => {
        // Permission denied or error — fall back to Edinburgh centre
        mapRef.current?.setView(EDINBURGH_CENTER, DEFAULT_ZOOM);
      }
    );
  }, []);

  return (
    <div className="map-page">

      {/* Mobile view switcher */}
      <ViewSwitcher activeView="map" onNavigate={v => onNavigate?.(v)} onHome={goToHome} onSearch={onToggleSearch} />

      <div className="map-toolbar">
        <div className="map-month-nav">
          <button className="map-month-btn" onClick={goToPrevMonth} aria-label="Previous month">&lsaquo;</button>
          <span className="map-month-label">{MONTHS[viewMonth]} {viewYear}</span>
          <button className="map-month-btn" onClick={goToNextMonth} aria-label="Next month">&rsaquo;</button>
          <button className="map-home-btn" onClick={goToHome} aria-label="Go to my location">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Home
          </button>
          <ViewSwitcher
            className="map-toolbar-view-switcher"
            activeView="map"
            onNavigate={v => onNavigate?.(v)}
            onSearch={onToggleSearch}
          />
        </div>
      </div>

      {searchOpen && (
        <SearchBar
          wrapperClassName="map-search-wrap"
          value={searchQuery}
          onChange={setSearchQuery}
          onClose={() => onToggleSearch?.()}
          inputRef={searchInputRef}
          wrapRef={searchWrapRef}
        />
      )}

      {error && (
        <div className="map-error-banner">
          Failed to load events.
          <button className="map-error-retry" onClick={() => setRetryCount(c => c + 1)}>
            Retry
          </button>
        </div>
      )}

      <div className="map-body">
        <aside className="map-sidebar">
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

        <div className="map-area">
          <div className="map-container" ref={mapContainerRef} />

          {loading && (
            <div className="map-loading">Loading events&hellip;</div>
          )}

          {!loading && filteredEvents.length === 0 && !error && (
            <div className="map-empty">No in-person events this month</div>
          )}

          {onlineCount > 0 && !loading && (
            <div className="map-online-badge">
              {onlineCount} online event{onlineCount !== 1 ? "s" : ""} not shown
            </div>
          )}
        </div>
      </div>

      <MobileFilterBar
        collapsed={filtersCollapsed}
        onToggle={() => setFiltersCollapsed(c => !c)}
        activeCount={selectedCategories.size || undefined}
      >
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
