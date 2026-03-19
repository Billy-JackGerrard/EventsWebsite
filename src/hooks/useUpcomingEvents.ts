import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import type { Event } from "../utils/types";

/**
 * Fetches all approved events starting from now up to 1 year ahead.
 * Used by EventList (and could be shared with Calendar's search if needed).
 */
export function useUpcomingEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      .then(({ data, error: fetchError }) => {
        if (!isCurrent) return;
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setEvents(data || []);
        }
        setLoading(false);
      });

    return () => { isCurrent = false; };
  }, []);

  return { events, loading, error };
}
