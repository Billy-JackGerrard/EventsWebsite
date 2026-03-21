import type { Event } from "./types";

export type DateFilter = "all" | "week" | "weekend" | "month";

export const DATE_FILTER_LABELS: Record<DateFilter, string> = {
  all:     "All dates",
  week:    "This week",
  weekend: "This weekend",
  month:   "This month",
};

/**
 * Returns true if the event's start date falls within the given date filter window.
 * Filtering is based on starts_at only.
 */
export function passesDateFilter(event: Event, filter: DateFilter): boolean {
  if (filter === "all") return true;

  const d = new Date(event.starts_at);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (filter === "week") {
    const end = new Date(now);
    end.setDate(now.getDate() + 7);
    return d >= now && d < end;
  }

  if (filter === "weekend") {
    const day = d.getDay(); // 0=Sun, 6=Sat
    if (day !== 0 && day !== 6) return false;
    // If today is Sunday, "this weekend" is the Sat just passed + today
    // Otherwise find the upcoming Saturday (same day if today is Sat)
    const todayDay = now.getDay();
    const daysUntilSat = todayDay === 0 ? -1 : (6 - todayDay + 7) % 7;
    const thisSat = new Date(now);
    thisSat.setDate(now.getDate() + daysUntilSat);
    const endSun = new Date(thisSat);
    endSun.setDate(thisSat.getDate() + 2);
    return d >= thisSat && d < endSun;
  }

  if (filter === "month") {
    return (
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear() &&
      d >= now
    );
  }

  return true;
}

export type DistanceCenter = { lat: number; lng: number };

function haversineDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Returns true if the event is within radiusMiles of center.
 * Events without lat/lng always return false when the filter is active.
 */
export function passesDistanceFilter(event: Event, center: DistanceCenter, radiusMiles: number): boolean {
  if (event.latitude == null || event.longitude == null) return false;
  return haversineDistanceMiles(center.lat, center.lng, event.latitude, event.longitude) <= radiusMiles;
}

/**
 * Returns true if the event matches all words in the search query
 * (case-insensitive, space-separated words, searches title + description + location).
 */
export function matchesSearch(event: Event, query: string): boolean {
  if (!query.trim()) return true;
  const haystack = [event.title, event.description ?? "", event.location ?? ""]
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every(word => haystack.includes(word));
}
