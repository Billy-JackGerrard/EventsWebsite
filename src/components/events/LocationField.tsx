import { useState, useRef, useCallback } from "react";
import type { EventAddress } from "../../utils/types";
import { formatAddress } from "../../utils/types";
import { useLocationSearch } from "../../hooks/useLocationSearch";
import type { NominatimResult } from "../../hooks/useLocationSearch";
import { useClickOutside } from "../../hooks/useClickOutside";

type Props = {
  location: string;
  address: EventAddress | null;
  onLocationChange: (location: string) => void;
  onAddressChange: (address: EventAddress | null) => void;
  onCoordsChange: (lat: number | null, lon: number | null) => void;
};

export default function LocationField({ location, address, onLocationChange, onAddressChange, onCoordsChange }: Props) {
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const locationFieldRef = useRef<HTMLDivElement>(null);
  const { results: locationResults, loading: locationLoading, error: locationError, clear: clearLocationResults } = useLocationSearch(locationQuery, { viewbox: "-3.35,55.88,-3.05,56.01", bounded: "0" });

  const closeLocationDropdown = useCallback(() => setLocationDropdownOpen(false), []);
  useClickOutside(locationFieldRef, closeLocationDropdown, locationDropdownOpen);

  const handleLocationSelect = (result: NominatimResult) => {
    const name = result.address?.amenity || result.name || result.display_name.split(",")[0];
    onLocationChange(name);
    setLocationQuery("");

    const addr: EventAddress = {
      road: result.address?.road,
      house_number: result.address?.house_number,
      suburb: result.address?.suburb,
      city: result.address?.city,
      state: result.address?.state,
      postcode: result.address?.postcode,
      country: result.address?.country,
    };
    onAddressChange(addr);
    onCoordsChange(parseFloat(result.lat), parseFloat(result.lon));
    setLocationDropdownOpen(false);
    clearLocationResults();
  };

  return (
    <>
      <div className="form-field">
        <label htmlFor="ef-location" className="form-label">Location *</label>
        <div className="location-field-wrapper" ref={locationFieldRef}>
          <input
            id="ef-location"
            className="form-input"
            type="text"
            placeholder="e.g. Blackwood Bar"
            maxLength={150}
            value={location}
            onChange={e => {
              onLocationChange(e.target.value);
              setLocationQuery(e.target.value);
              setLocationDropdownOpen(true);
              onAddressChange(null);
              onCoordsChange(null, null);
            }}
            onFocus={() => { if (locationResults.length > 0) setLocationDropdownOpen(true); }}
          />
          {locationDropdownOpen && (locationResults.length > 0 || (locationLoading && location.length >= 3)) && (
            <div className="location-dropdown">
              {locationResults.map(r => (
                <button
                  key={r.place_id}
                  type="button"
                  className="location-dropdown-option"
                  onMouseDown={e => { e.preventDefault(); handleLocationSelect(r); }}
                >
                  <span className="location-dropdown-name">
                    {r.address?.amenity || r.name || r.display_name.split(",")[0]}
                  </span>
                  <span className="location-dropdown-detail">
                    {r.display_name.split(",").slice(1, 3).join(",").trim()}
                  </span>
                </button>
              ))}
              {locationLoading && locationResults.length === 0 && (
                <div className="location-dropdown-loading">
                  <span className="location-search-spinner" aria-hidden="true" />
                  Searching locations…
                </div>
              )}
            </div>
          )}
          {locationLoading && (
            <span className="location-search-hint">
              <span className="location-search-spinner" aria-hidden="true" />
              Searching locations…
            </span>
          )}
          {locationError && !locationLoading && (
            <span className="form-field-error">{locationError}</span>
          )}
        </div>
      </div>

      {address && (
        <div className="form-field">
          <label className="form-label">Address</label>
          <div className="location-address-display">{formatAddress(address)}</div>
        </div>
      )}
    </>
  );
}
