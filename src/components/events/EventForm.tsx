import { useState, useEffect, useRef, useCallback } from "react";
import { expandRecurrences, DEFAULT_RULE } from "../../utils/recurrence";
import type { RecurrenceRule } from "../../utils/recurrence";
import { isoToLocal, getSoftMinDateTime, formatLocalDateTime } from "../../utils/dates";
import type { Event, EventAddress, Category, AgeRating } from "../../utils/types";
import { CATEGORIES, CATEGORY_COLOURS, AGE_RATINGS, BOOKING_INFO_OPTIONS, BOOKING_INFO_LABELS } from "../../utils/types";
import { isValidEmail } from "../../utils/validation";
import { useClickOutside } from "../../hooks/useClickOutside";
import RecurrencePicker from "./RecurrencePicker";
import LocationField from "./LocationField";
import AccessibilityField from "./AccessibilityField";
import "./EventForm.css";

export type { RecurrenceRule };

export type EventFormRow = {
  title: string;
  category: Category;
  description: string | null;
  event_type: 'in_person' | 'online' | 'both';
  location: string | null;
  address: EventAddress | null;
  latitude: number | null;
  longitude: number | null;
  starts_at: string;
  finishes_at: string | null;
  contact_name: string | null;
  contact_email: string | null;
  url: string | null;
  price: string | null;
  booking_info: string | null;
  accessibility: string[];
  age_rating: AgeRating | null;
  recurrence: RecurrenceRule | null;
};

type Props = {
  initialValues?: Event;
  prefillDate?: string; // "YYYY-MM-DD" — pre-populates the start date when adding from calendar
  showRecurrence?: boolean;
  submitLabel: string;
  submittingLabel: string;
  externalError?: string | null;
  submitting?: boolean;
  submitDisabled?: boolean;
  onSubmit: (rows: EventFormRow[]) => void;
  onCancel?: () => void;
  onStartsAtChange?: (value: string) => void;
  children?: React.ReactNode;
};

export default function EventForm({
  initialValues,
  prefillDate,
  showRecurrence = true,
  submitLabel,
  submittingLabel,
  externalError,
  submitting = false,
  submitDisabled = false,
  onSubmit,
  onCancel,
  onStartsAtChange,
  children,
}: Props) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [isInPerson, setIsInPerson] = useState(initialValues?.event_type !== 'online');
  const [isOnline, setIsOnline] = useState(initialValues?.event_type === 'online' || initialValues?.event_type === 'both');
  const [location, setLocation] = useState(initialValues?.location ?? "");
  const [address, setAddress] = useState<EventAddress | null>(initialValues?.address ?? null);
  const [latitude, setLatitude] = useState<number | null>(initialValues?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(initialValues?.longitude ?? null);
  const [startsAt, setStartsAt] = useState(() => {
    if (initialValues?.starts_at) return isoToLocal(initialValues.starts_at);
    if (prefillDate) return `${prefillDate}T09:00`;
    return "";
  });
  const [finishesAt, setFinishesAt] = useState(() => {
    if (initialValues?.finishes_at) return isoToLocal(initialValues.finishes_at);
    if (prefillDate) return `${prefillDate}T10:00`;
    return "";
  });
  const [contactName, setContactName] = useState(initialValues?.contact_name ?? "");
  const [contactEmail, setContactEmail] = useState(initialValues?.contact_email ?? "");
  const [url, setUrl] = useState(initialValues?.url ?? "");
  const [price, setPrice] = useState(initialValues?.price ?? "");
  const [bookingInfo, setBookingInfo] = useState(initialValues?.booking_info ?? "");
  const [ageRating, setAgeRating] = useState<AgeRating | null>(initialValues?.age_rating ?? null);
  const [category, setCategory] = useState<Category | "">(initialValues?.category ?? "");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const [internalError, setInternalError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const [accessibility, setAccessibility] = useState<string[]>(
    (initialValues?.accessibility ?? []).filter(o => !o.startsWith("Other: "))
  );
  const [accessibilityOther, setAccessibilityOther] = useState<string>(
    initialValues?.accessibility?.find(o => o.startsWith("Other: "))?.replace("Other: ", "") ?? ""
  );

  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule>(DEFAULT_RULE);

  const [minDateTime, setMinDateTime] = useState(getSoftMinDateTime);
  useEffect(() => {
    const id = setInterval(() => setMinDateTime(getSoftMinDateTime()), 60_000);
    return () => clearInterval(id);
  }, []);

  const closeCategoryDropdown = useCallback(() => setCategoryOpen(false), []);
  useClickOutside(categoryRef, closeCategoryDropdown, categoryOpen);

  // ── Reset all fields when initialValues changes (edit form re-init) ────
  const prevInitialRef = useRef<Event | undefined>(initialValues);
  useEffect(() => {
    if (initialValues && initialValues !== prevInitialRef.current) {
      prevInitialRef.current = initialValues;
      setTitle(initialValues.title ?? "");
      setDescription(initialValues.description ?? "");
      setIsInPerson(initialValues.event_type !== 'online');
      setIsOnline(initialValues.event_type === 'online' || initialValues.event_type === 'both');
      setLocation(initialValues.location ?? "");
      setAddress(initialValues.address ?? null);
      setLatitude(initialValues.latitude ?? null);
      setLongitude(initialValues.longitude ?? null);
      setStartsAt(initialValues.starts_at ? isoToLocal(initialValues.starts_at) : "");
      setFinishesAt(initialValues.finishes_at ? isoToLocal(initialValues.finishes_at) : "");
      setContactName(initialValues.contact_name ?? "");
      setContactEmail(initialValues.contact_email ?? "");
      setUrl(initialValues.url ?? "");
      setPrice(initialValues.price ?? "");
      setBookingInfo(initialValues.booking_info ?? "");
      setCategory(initialValues.category ?? "");
      setAccessibility((initialValues.accessibility ?? []).filter(o => !o.startsWith("Other: ")));
      setAccessibilityOther(initialValues.accessibility?.find(o => o.startsWith("Other: "))?.replace("Other: ", "") ?? "");
      setAgeRating(initialValues.age_rating ?? null);
      setRecurrenceEnabled(false);
      setRecurrenceRule(DEFAULT_RULE);
      setInternalError(null);
    }
  }, [initialValues]);

  // ── Date/time handling ─────────────────────────────────────────────────
  const handleStartsAtChange = (value: string) => {
    const oldStartsAt = startsAt;
    setStartsAt(value);
    onStartsAtChange?.(value);

    if (!value) {
      setFinishesAt("");
      return;
    }

    const newStart = new Date(value);
    if (finishesAt) {
      if (oldStartsAt) {
        const duration = new Date(finishesAt).getTime() - new Date(oldStartsAt).getTime();
        setFinishesAt(formatLocalDateTime(new Date(newStart.getTime() + duration)));
      } else {
        setFinishesAt(formatLocalDateTime(new Date(newStart.getTime() + 60 * 60 * 1000)));
      }
    } else {
      setFinishesAt(formatLocalDateTime(new Date(newStart.getTime() + 60 * 60 * 1000)));
    }
  };

  // Derived date/time parts for split inputs (iOS-friendly)
  const startsAtDate = startsAt.slice(0, 10);
  const startsAtTime = startsAt.length >= 16 ? startsAt.slice(11, 16) : "";
  const finishesAtDate = finishesAt.slice(0, 10);
  const finishesAtTime = finishesAt.length >= 16 ? finishesAt.slice(11, 16) : "";
  const minDate = minDateTime.slice(0, 10);

  const handleStartsAtDateChange = (date: string) => {
    if (!date) { handleStartsAtChange(""); return; }
    const combined = `${date}T${startsAtTime || "09:00"}`;
    handleStartsAtChange(combined);
  };
  const handleStartsAtTimeChange = (time: string) => {
    if (!time) { handleStartsAtChange(""); return; }
    const combined = `${startsAtDate || minDate}T${time}`;
    handleStartsAtChange(combined);
  };
  const handleFinishesAtDateChange = (date: string) => {
    if (!date) { setFinishesAt(""); return; }
    const time = finishesAtTime || startsAtTime || "10:00";
    setFinishesAt(`${date}T${time}`);
  };
  const handleFinishesAtTimeChange = (time: string) => {
    if (!time) { setFinishesAt(""); return; }
    const date = finishesAtDate || startsAtDate || minDate;
    setFinishesAt(`${date}T${time}`);
  };

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setInternalError(null);

    if (!title || !startsAt) {
      setInternalError("Please fill in at least a title and start time.");
      return;
    }
    if (!finishesAt) {
      setInternalError("Please fill in a finish time.");
      return;
    }
    if (!category) {
      setInternalError("Please select a category.");
      return;
    }
    if (finishesAt && new Date(finishesAt) <= new Date(startsAt)) {
      setInternalError("The finish time must be after the start time.");
      return;
    }
    if (!bookingInfo) {
      setInternalError("Please select how to book.");
      return;
    }
    if (bookingInfo === "via_link" && !url) {
      setInternalError("Please enter a link.");
      return;
    }
    if (url && !/^https?:\/\//.test(url)) {
      setInternalError("Please enter a valid URL starting with http:// or https://");
      return;
    }
    if (bookingInfo === "by_contacting" && !contactEmail) {
      setInternalError("Please enter a contact email.");
      return;
    }
    if (!isInPerson && !isOnline) {
      setInternalError("Please select at least one event type.");
      return;
    }
    if (isInPerson && !location) {
      setInternalError("Please enter a location for this in-person event.");
      return;
    }
    if (contactEmail && !isValidEmail(contactEmail)) {
      setInternalError("Please enter a valid email address.");
      return;
    }

    const firstStart = new Date(startsAt);
    const firstFinish = finishesAt ? new Date(finishesAt) : null;

    const activeRule: RecurrenceRule = showRecurrence && recurrenceEnabled
      ? recurrenceRule
      : { frequency: "none" };

    const occurrences = expandRecurrences(activeRule, firstStart, firstFinish);
    const isRecurring = showRecurrence && recurrenceEnabled && occurrences.length > 1;

    const recurrence: RecurrenceRule | null = isRecurring
      ? { ...activeRule, id: crypto.randomUUID() }
      : null;

    const rows: EventFormRow[] = occurrences.map(({ start, finish }) => ({
      title,
      category: category as Category,
      description: description || null,
      event_type: isInPerson && isOnline ? 'both' : isOnline ? 'online' : 'in_person',
      location: isInPerson ? (location || null) : null,
      address: isInPerson ? (address ?? null) : null,
      latitude: isInPerson ? (latitude ?? null) : null,
      longitude: isInPerson ? (longitude ?? null) : null,
      starts_at: start.toISOString(),
      finishes_at: finish ? finish.toISOString() : null,
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      url: url || null,
      price: price || null,
      booking_info: bookingInfo || null,
      accessibility: accessibilityOther.trim()
        ? [...accessibility, `Other: ${accessibilityOther.trim()}`]
        : accessibility,
      age_rating: ageRating,
      recurrence,
    }));

    onSubmit(rows);
  };

  const displayError = internalError || externalError;

  useEffect(() => {
    if (displayError && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [displayError]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <form className="eventform-root" noValidate onSubmit={handleSubmit}>
      {displayError && <div className="form-error" ref={errorRef} role="alert">{displayError}</div>}

      <div className="form-field">
        <label htmlFor="ef-title" className="form-label">Title *</label>
        <input
          id="ef-title"
          className="form-input"
          type="text"
          placeholder="e.g. BSL Social Evening"
          maxLength={100}
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
      </div>

      <div className="form-field">
        <label className="form-label">Category *</label>
        <div className="category-select" ref={categoryRef}>
          <button
            type="button"
            className="form-input category-select-trigger"
            onClick={() => setCategoryOpen(o => !o)}
          >
            {category ? (
              <>
                <span className="category-dot" style={{ background: CATEGORY_COLOURS[category as Category] }} />
                {category}
              </>
            ) : (
              <span className="category-select-placeholder">Select a category…</span>
            )}
            <span className="category-select-arrow">▾</span>
          </button>
          {categoryOpen && (
            <div className="category-select-dropdown">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`category-select-option${c === category ? " category-select-option--active" : ""}`}
                  onClick={() => { setCategory(c); setCategoryOpen(false); }}
                >
                  <span className="category-dot" style={{ background: CATEGORY_COLOURS[c] }} />
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="ef-description" className="form-label">Description</label>
        <textarea
          id="ef-description"
          className="form-input addevent-textarea"
          placeholder="A short description of the event..."
          maxLength={1000}
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </div>

      <div className="form-field">
        <label htmlFor="ef-link" className="form-label">Link{bookingInfo === "via_link" ? " *" : ""}</label>
        <input
          id="ef-link"
          className="form-input"
          type="url"
          placeholder="e.g. https://eventbrite.com/..."
          value={url}
          onChange={e => setUrl(e.target.value)}
        />
      </div>

      <div className="form-field">
        <label className="form-label">Event Type *</label>
        <div className="event-type-toggle">
          <button
            type="button"
            className={`event-type-btn${isInPerson ? ' event-type-btn--active' : ''}`}
            onClick={() => setIsInPerson(v => !v)}
          >
            📍 In Person
          </button>
          <button
            type="button"
            className={`event-type-btn${isOnline ? ' event-type-btn--active' : ''}`}
            onClick={() => setIsOnline(v => !v)}
          >
            💻 Online
          </button>
        </div>
      </div>

      {isInPerson && (
        <LocationField
          location={location}
          address={address}
          onLocationChange={setLocation}
          onAddressChange={setAddress}
          onCoordsChange={(lat, lon) => { setLatitude(lat); setLongitude(lon); }}
        />
      )}

      <div className="form-field">
        <label className="form-label">Start Time *</label>
        <div className="datetime-row">
          <input
            id="ef-starts-at-date"
            className="form-input"
            type="date"
            min={minDate}
            value={startsAtDate}
            onChange={e => handleStartsAtDateChange(e.target.value)}
          />
          <input
            id="ef-starts-at-time"
            className="form-input"
            type="time"
            value={startsAtTime}
            onChange={e => handleStartsAtTimeChange(e.target.value)}
          />
        </div>
      </div>

      <div className="form-field">
        <label className="form-label">Finish Time <span className="form-label-muted">· estimated</span> *</label>
        <div className="datetime-row">
          <input
            id="ef-ends-at-date"
            className="form-input"
            type="date"
            min={startsAtDate || minDate}
            value={finishesAtDate}
            onChange={e => handleFinishesAtDateChange(e.target.value)}
          />
          <input
            id="ef-ends-at-time"
            className="form-input"
            type="time"
            value={finishesAtTime}
            onChange={e => handleFinishesAtTimeChange(e.target.value)}
          />
        </div>
        {finishesAt && startsAt && finishesAt <= startsAt && (
          <span className="form-field-error">End time must be after the start time.</span>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="ef-price" className="form-label">Price</label>
        <input
          id="ef-price"
          className="form-input"
          type="text"
          placeholder="e.g. Free / £5 / £10–£15"
          value={price}
          onChange={e => setPrice(e.target.value)}
        />
      </div>

      <div className="form-field">
        <label htmlFor="ef-booking" className="form-label">How to Book</label>
        <select
          id="ef-booking"
          className="form-input addevent-select"
          value={bookingInfo}
          onChange={e => setBookingInfo(e.target.value)}
        >
          <option value="">-- Select --</option>
          {BOOKING_INFO_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{BOOKING_INFO_LABELS[opt]}</option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="ef-contact-name" className="form-label">Contact Name</label>
        <input
          id="ef-contact-name"
          className="form-input"
          type="text"
          placeholder="e.g. Jane Smith"
          value={contactName}
          onChange={e => setContactName(e.target.value)}
        />
      </div>

      <div className="form-field">
        <label htmlFor="ef-contact-email" className="form-label">Contact Email</label>
        <input
          id="ef-contact-email"
          className="form-input"
          type="email"
          placeholder="e.g. hello@example.com"
          value={contactEmail}
          onChange={e => setContactEmail(e.target.value)}
        />
      </div>

      <AccessibilityField
        accessibility={accessibility}
        accessibilityOther={accessibilityOther}
        onAccessibilityChange={setAccessibility}
        onAccessibilityOtherChange={setAccessibilityOther}
      />

      <div className="form-field">
        <label className="form-label">Age Rating</label>
        <div className="event-type-toggle">
          {AGE_RATINGS.map(rating => (
            <button
              key={rating}
              type="button"
              className={`event-type-btn${ageRating === rating ? ' event-type-btn--active' : ''}`}
              onClick={() => setAgeRating(prev => prev === rating ? null : rating)}
            >
              {rating}
            </button>
          ))}
        </div>
      </div>

      {showRecurrence && (
        <RecurrencePicker
          enabled={recurrenceEnabled}
          rule={recurrenceRule}
          startsAt={startsAt}
          onToggle={setRecurrenceEnabled}
          onRuleChange={setRecurrenceRule}
        />
      )}

      {children}

      <div className="eventform-actions">
        {onCancel && (
          <button
            className="btn-primary eventform-btn--cancel"
            onClick={onCancel}
            disabled={submitting}
            type="button"
          >
            Cancel
          </button>
        )}
        <button
          className="btn-primary"
          disabled={submitting || submitDisabled || !!(finishesAt && startsAt && finishesAt <= startsAt)}
          type="submit"
        >
          {submitting ? (
            <span className="btn-loading">
              <span className="btn-spinner" aria-hidden="true" />
              {submittingLabel}
            </span>
          ) : submitLabel}
        </button>
      </div>
    </form>
  );
}
