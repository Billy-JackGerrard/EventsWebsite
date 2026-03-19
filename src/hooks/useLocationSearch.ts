import { useState, useEffect, useRef } from "react";
import { useDebouncedValue } from "./useDebouncedValue";

export type NominatimResult = {
  place_id: number;
  display_name: string;
  name: string;
  lat: string;
  lon: string;
  address: {
    amenity?: string;
    road?: string;
    house_number?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export function useLocationSearch(query: string) {
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debouncedQuery = useDebouncedValue(query, 500);

  useEffect(() => {
    if (debouncedQuery.length < 3) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      format: "json",
      q: debouncedQuery,
      countrycodes: "gb",
      limit: "5",
      addressdetails: "1",
      viewbox: "-3.35,55.88,-3.05,56.01",
      bounded: "0",
    });

    fetch(`${NOMINATIM_URL}?${params}`, {
      signal: controller.signal,
      headers: { "Accept": "application/json", "User-Agent": "EdinburghBSLEvents/1.0" },
    })
      .then(res => {
        if (!res.ok) throw new Error(`Nominatim ${res.status}`);
        return res.json();
      })
      .then((data: NominatimResult[]) => {
        if (!controller.signal.aborted) {
          setResults(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (err.name !== "AbortError") {
          setResults([]);
          setLoading(false);
          setError("Location search failed. Please try again.");
        }
      });

    return () => controller.abort();
  }, [debouncedQuery]);

  const clear = () => { setResults([]); setError(null); };

  return { results, loading, error, clear };
}
