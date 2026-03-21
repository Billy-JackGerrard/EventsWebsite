import { useState } from "react";
import type { DateFilter, DistanceCenter } from "../utils/eventFilters";

export type DistanceFilter = { center: DistanceCenter; radiusMiles: number } | null;
export const RADIUS_OPTIONS = [5, 10, 20, 30, 50] as const;
export type RadiusMiles = typeof RADIUS_OPTIONS[number];

/**
 * Shared filter state for category and date filters.
 * Used by both Calendar and EventList to keep logic consistent.
 */
export function useFilters() {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>(null);

  function clearDistanceFilter() { setDistanceFilter(null); }

  function toggleCategory(cat: string) {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function clearCategories() {
    setSelectedCategories(new Set());
  }

  return { selectedCategories, setSelectedCategories, dateFilter, setDateFilter, toggleCategory, clearCategories, distanceFilter, setDistanceFilter, clearDistanceFilter };
}
