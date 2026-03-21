import { useState, useEffect } from "react";
import type { Event } from "../utils/types";
import { approvedEventsQuery } from "../utils/queries";

/**
 * Fetches approved events — either upcoming (next year) or past (last year).
 * Used by EventList.
 */
export function useUpcomingEvents(showPast = false) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    setLoading(true);
    const now = new Date();

    let query = approvedEventsQuery();

    if (showPast) {
      const start = new Date(now);
      start.setFullYear(start.getFullYear() - 1);
      query = query
        .lt("starts_at", now.toISOString())
        .gte("starts_at", start.toISOString())
        .order("starts_at", { ascending: false });
    } else {
      const end = new Date(now);
      end.setFullYear(end.getFullYear() + 1);
      query = query
        .gte("starts_at", now.toISOString())
        .lte("starts_at", end.toISOString())
        .order("starts_at", { ascending: true });
    }

    query.then(({ data, error: fetchError }) => {
      if (!isCurrent) return;
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setEvents(data || []);
      }
      setLoading(false);
    });

    return () => { isCurrent = false; };
  }, [showPast]);

  return { events, loading, error };
}
