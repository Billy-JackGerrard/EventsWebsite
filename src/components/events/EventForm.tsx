import { useState, useEffect, useRef } from "react";
import { expandRecurrences, DEFAULT_RULE } from "../../utils/recurrence";
import type { RecurrenceRule } from "../../utils/recurrence";
import { isoToLocal, getSoftMinDateTime } from "../../utils/dates";
import type { Event, Category } from "../../utils/types";
import { CATEGORIES, CATEGORY_COLOURS } from "../../utils/types";
import RecurrencePicker from "./RecurrencePicker";
import "./EventForm.css";

export type { RecurrenceRule };

export type EventFormRow = {
  title: string;
  category: Category;
  description: string | null;
  location: string | null;
  starts_at: string;
  finishes_at: string | null;
  contact_name: string | null;
  contact_email: string | null;
  url: string | null;
  price: string | null;
  booking_info: string | null;
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
  onSubmit,
  onCancel,
  onStartsAtChange,
  children,
}: Props) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [location, setLocation] = useState(initialValues?.location ?? "");
  const [startsAt, setStartsAt] = useState(() => {
    if (initialValues?.starts_at) return isoToLocal(initialValues.starts_at);
    if (prefillDate) return `${prefillDate}T09:00`;
    return "";
  });
  const [finishesAt, setFinishesAt] = useState(initialValues?.finishes_at ? isoToLocal(initialValues.finishes_at) : "");
  const [contactName, setContactName] = useState(initialValues?.contact_name ?? "");
  const [contactEmail, setContactEmail] = useState(initialValues?.contact_email ?? "");
  const [url, setUrl] = useState(initialValues?.url ?? "");
  const [price, setPrice] = useState(initialValues?.price ?? "");
  const [bookingInfo, setBookingInfo] = useState(initialValues?.booking_info ?? "");
  const [category, setCategory] = useState<string>(initialValues?.category ?? "");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const [internalError, setInternalError] = useState<string | null>(null);

  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule>(DEFAULT_RULE);

  const [minDateTime, setMinDateTime] = useState(getSoftMinDateTime);
  useEffect(() => {
    const id = setInterval(() => setMinDateTime(getSoftMinDateTime()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!categoryOpen) return;
    const handler = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node))
        setCategoryOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [categoryOpen]);

  const prevInitialRef = useRef<Event | undefined>(initialValues);
  useEffect(() => {
    if (initialValues && initialValues !== prevInitialRef.current) {
      prevInitialRef.current = initialValues;
      setTitle(initialValues.title ?? "");
      setDescription(initialValues.description ?? "");
      setLocation(initialValues.location ?? "");
      setStartsAt(initialValues.starts_at ? isoToLocal(initialValues.starts_at) : "");
      setFinishesAt(initialValues.finishes_at ? isoToLocal(initialValues.finishes_at) : "");
      setContactName(initialValues.contact_name ?? "");
      setContactEmail(initialValues.contact_email ?? "");
      setUrl(initialValues.url ?? "");
      setPrice(initialValues.price ?? "");
      setBookingInfo(initialValues.booking_info ?? "");
      setCategory(initialValues.category ?? "");
      setRecurrenceEnabled(false);
      setRecurrenceRule(DEFAULT_RULE);
      setInternalError(null);
    }
  }, [initialValues]);

  const handleStartsAtChange = (value: string) => {
    setStartsAt(value);
    if (finishesAt && finishesAt <= value) setFinishesAt("");
    onStartsAtChange?.(value);
  };

  const handleSubmit = () => {
    setInternalError(null);

    if (!title || !startsAt) {
      setInternalError("Please fill in at least a title and start time.");
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
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
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

    // Embed the series id directly in the rule so there's a single unified
    // field rather than separate recurrence_id + recurrence_rule columns.
    const recurrence: RecurrenceRule | null = isRecurring
      ? { ...activeRule, id: crypto.randomUUID() }
      : null;

    const rows: EventFormRow[] = occurrences.map(({ start, finish }) => ({
      title,
      category: category as Category,
      description: description || null,
      location: location || null,
      starts_at: start.toISOString(),
      finishes_at: finish ? finish.toISOString() : null,
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      url: url || null,
      price: price || null,
      booking_info: bookingInfo || null,
      recurrence,
    }));

    onSubmit(rows);
  };

  const displayError = internalError || externalError;

  return (
    <div className="eventform-root">
      {displayError && <div className="addevent-error">{displayError}</div>}

      <div className="addevent-field">
        <label className="addevent-label">Title *</label>
        <input
          className="addevent-input"
          type="text"
          placeholder="e.g. BSL Social Evening"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
      </div>

      <div className="addevent-field">
        <label className="addevent-label">Category *</label>
        <div className="category-select" ref={categoryRef}>
          <button
            type="button"
            className="addevent-input category-select-trigger"
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

      <div className="addevent-field">
        <label className="addevent-label">Description</label>
        <textarea
          className="addevent-input addevent-textarea"
          placeholder="A short description of the event..."
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </div>

      <div className="addevent-field">
        <label className="addevent-label">Location</label>
        <input
          className="addevent-input"
          type="text"
          placeholder="e.g. The Royal Mile, Edinburgh"
          value={location}
          onChange={e => setLocation(e.target.value)}
        />
      </div>

      <div className="addevent-field">
        <label className="addevent-label">Start Time *</label>
        <input
          className="addevent-input"
          type="datetime-local"
          min={minDateTime}
          value={startsAt}
          onChange={e => handleStartsAtChange(e.target.value)}
        />
      </div>

      <div className="addevent-field">
        <label className="addevent-label">End Time</label>
        <input
          className="addevent-input"
          type="datetime-local"
          min={startsAt || minDateTime}
          value={finishesAt}
          onChange={e => setFinishesAt(e.target.value)}
        />
      </div>

      <div className="addevent-field">
        <label className="addevent-label">Price</label>
        <input
          className="addevent-input"
          type="text"
          placeholder="e.g. Free / £5 / £10–£15"
          value={price}
          onChange={e => setPrice(e.target.value)}
        />
      </div>

      <div className="addevent-field">
        <label className="addevent-label">Booking Info</label>
        <input
          className="addevent-input"
          type="text"
          placeholder="e.g. Book via Eventbrite, no booking needed…"
          value={bookingInfo}
          onChange={e => setBookingInfo(e.target.value)}
        />
      </div>

      <div className="addevent-field">
        <label className="addevent-label">Contact Name</label>
        <input
          className="addevent-input"
          type="text"
          placeholder="e.g. Jane Smith"
          value={contactName}
          onChange={e => setContactName(e.target.value)}
        />
      </div>

      <div className="addevent-field">
        <label className="addevent-label">Contact Email</label>
        <input
          className="addevent-input"
          type="email"
          placeholder="e.g. hello@example.com"
          value={contactEmail}
          onChange={e => setContactEmail(e.target.value)}
        />
      </div>

      <div className="addevent-field">
        <label className="addevent-label">Website / Booking Link</label>
        <input
          className="addevent-input"
          type="url"
          placeholder="e.g. https://eventbrite.com/..."
          value={url}
          onChange={e => setUrl(e.target.value)}
        />
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
            className="addevent-btn eventform-btn--cancel"
            onClick={onCancel}
            disabled={submitting}
            type="button"
          >
            Cancel
          </button>
        )}
        <button
          className="addevent-btn"
          onClick={handleSubmit}
          disabled={submitting}
          type="button"
        >
          {submitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </div>
  );
}