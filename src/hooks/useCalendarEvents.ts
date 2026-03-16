import { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient";
import type { Event } from "../utils/types";
import { toLocalDateKey } from "../utils/dates";

// Shared base query — approved events ordered by start time.
const approvedEvents = () =>
  supabase.from("events").select("*").eq("approved", true).order("starts_at", { ascending: true });

type MonthKey = { month: number; year: number };

/**
 * Fetches approved events for a range of months (windowStart → windowEnd)
 * and a separate forward-looking list used by the search dropdown.
 *
 * Returns:
 *   eventsByDate — Map<"YYYY-MM-DD", Event[]> covering the whole window
 *   allEvents    — forward-looking events for search
 *   loading      — true while the initial fetch is in-flight
 */
export function useCalendarEvents(windowStart: MonthKey, windowEnd: MonthKey) {
  const [events,   setEvents]   = useState<Event[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  // Stable cache keys so the effect only re-fires when the window actually changes
  const fromKey = `${windowStart.year}-${windowStart.month}`;
  const toKey   = `${windowEnd.year}-${windowEnd.month}`;

  useEffect(() => {
    let isCurrent = true;
    setLoading(true);

    const fetchEvents = async () => {
      const fromDate = new Date(windowStart.year, windowStart.month, 1, 0, 0, 0, 0);
      const toDate   = new Date(windowEnd.year, windowEnd.month + 1, 0, 23, 59, 59, 999);

      const { data, error: fetchError } = await approvedEvents()
        .or(
          `and(starts_at.gte.${fromDate.toISOString()},starts_at.lte.${toDate.toISOString()}),` +
          `and(starts_at.lt.${fromDate.toISOString()},finishes_at.gte.${fromDate.toISOString()})`
        );

      if (!isCurrent) return;
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setError(null);
        setEvents(data || []);
      }
      setLoading(false);
    };

    fetchEvents();
    return () => { isCurrent = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromKey, toKey]);

  // Forward-looking events for the search dropdown (up to 1 year ahead).
  useEffect(() => {
    const fetchAll = async () => {
      const now = new Date();
      const windowEnd = new Date(now);
      windowEnd.setFullYear(windowEnd.getFullYear() + 1);

      const { data } = await approvedEvents()
        .gte("starts_at", now.toISOString())
        .lte("starts_at", windowEnd.toISOString());

      setAllEvents(data || []);
    };
    fetchAll();
  }, []);

  // Build eventsByDate map from the fetched events
  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const e of events) {
      const cursor = new Date(e.starts_at);
      cursor.setHours(0, 0, 0, 0);

      const end = e.finishes_at ? new Date(e.finishes_at) : new Date(e.starts_at);
      end.setHours(0, 0, 0, 0);

      while (cursor <= end) {
        const key = toLocalDateKey(cursor.toISOString());
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(e);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return map;
  }, [events]);

  return { eventsByDate, allEvents, loading, error };
}