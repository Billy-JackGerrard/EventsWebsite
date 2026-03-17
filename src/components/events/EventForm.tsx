import { useState, useEffect, useRef } from "react";
import { expandRecurrences, DEFAULT_RULE } from "../../utils/recurrence";
import type { RecurrenceRule } from "../../utils/recurrence";
import { isoToLocal, getSoftMinDateTime, formatLocalDateTime } from "../../utils/dates";
import type { Event, Category, AgeRating } from "../../utils/types";
import { CATEGORIES, CATEGORY_COLOURS, AGE_RATINGS, BOOKING_INFO_OPTIONS, BOOKING_INFO_LABELS } from "../../utils/types";
import RecurrencePicker from "./RecurrencePicker";
import "./EventForm.css";

export type { RecurrenceRule };

export type EventFormRow = {
  title: string;
  category: Category;
  description: string | null;
  event_type: 'in_person' | 'online' | 'both';
  location: string | null;
  postcode: string | null;
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
  const [postcode, setPostcode] = useState(initialValues?.postcode ?? "");
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
  const [ageRating, setAgeRating] = useState<AgeRating | null>(initialValues?.age_rating ?? null);
  const [category, setCategory] = useState<Category | "">(initialValues?.category ?? "");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const [internalError, setInternalError] = useState<string | null>(null);

  const ADVANCED_ACCESS_OPTIONS = {
    Audio: ["Hearing loop (T-loop)", "Audio description"],
    Physical: ["Wheelchair accessible", "Step-free access", "Accessible toilets", "Quiet room available"],
    Sensory: ["Low sensory environment", "Relaxed performance"],
  };
  const ALL_ADVANCED_OPTIONS = Object.values(ADVANCED_ACCESS_OPTIONS).flat();

  const [accessibility, setAccessibility] = useState<string[]>(
    (initialValues?.accessibility ?? []).filter(o => !o.startsWith("Other: "))
  );
  const [accessibilityOther, setAccessibilityOther] = useState<string>(
    initialValues?.accessibility?.find(o => o.startsWith("Other: "))?.replace("Other: ", "") ?? ""
  );
  const [showMoreAccessibility, setShowMoreAccessibility] = useState(
    () => (initialValues?.accessibility ?? []).some(o => ALL_ADVANCED_OPTIONS.includes(o) || o.startsWith("Other: "))
  );

  const toggleAccessibility = (option: string) => {
    setAccessibility(prev =>
      prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
    );
  };

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
      setIsInPerson(initialValues.event_type !== 'online');
      setIsOnline(initialValues.event_type === 'online' || initialValues.event_type === 'both');
      setLocation(initialValues.location ?? "");
      setPostcode(initialValues.postcode ?? "");
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
      setShowMoreAccessibility((initialValues.accessibility ?? []).some(o => ALL_ADVANCED_OPTIONS.includes(o) || o.startsWith("Other: ")));
      setAgeRating(initialValues.age_rating ?? null);
      setRecurrenceEnabled(false);
      setRecurrenceRule(DEFAULT_RULE);
      setInternalError(null);
    }
  }, [initialValues]);

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
      // Shift finish to preserve the existing duration
      if (oldStartsAt) {
        const duration = new Date(finishesAt).getTime() - new Date(oldStartsAt).getTime();
        setFinishesAt(formatLocalDateTime(new Date(newStart.getTime() + duration)));
      } else {
        setFinishesAt(formatLocalDateTime(new Date(newStart.getTime() + 60 * 60 * 1000)));
      }
    } else {
      // Auto-fill finish to start + 1 hour
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
    const combined = date && startsAtTime ? `${date}T${startsAtTime}` : "";
    handleStartsAtChange(combined);
  };
  const handleStartsAtTimeChange = (time: string) => {
    const combined = startsAtDate && time ? `${startsAtDate}T${time}` : "";
    handleStartsAtChange(combined);
  };
  const handleFinishesAtDateChange = (date: string) => {
    const time = finishesAtTime;
    setFinishesAt(date && time ? `${date}T${time}` : "");
  };
  const handleFinishesAtTimeChange = (time: string) => {
    const date = finishesAtDate || startsAtDate;
    setFinishesAt(date && time ? `${date}T${time}` : "");
  };

  const handleSubmit = () => {
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
      setInternalError("Please enter a valid URL starting with https://");
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
    if (isInPerson && !postcode) {
      setInternalError("Please enter a postcode for this in-person event.");
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
      event_type: isInPerson && isOnline ? 'both' : isOnline ? 'online' : 'in_person',
      location: isInPerson ? (location || null) : null,
      postcode: isInPerson ? (postcode || null) : null,
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

  return (
    <div className="eventform-root">
      {displayError && <div className="form-error">{displayError}</div>}

      <div className="form-field">
        <label htmlFor="ef-title" className="form-label">Title *</label>
        <input
          id="ef-title"
          className="form-input"
          type="text"
          placeholder="e.g. BSL Social Evening"
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
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </div>

      <div className="form-field">
        <label htmlFor="ef-link" className="form-label">Link</label>
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
        <>
          <div className="form-field">
            <label htmlFor="ef-location" className="form-label">Location *</label>
            <input
              id="ef-location"
              className="form-input"
              type="text"
              placeholder="e.g. Blackwood Bar"
              value={location}
              onChange={e => setLocation(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="ef-postcode" className="form-label">Postcode *</label>
            <input
              id="ef-postcode"
              className="form-input"
              type="text"
              placeholder="e.g. EH1 1AA"
              value={postcode}
              onChange={e => setPostcode(e.target.value)}
            />
          </div>
        </>
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
        <label className="form-label">End Time *</label>
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

      <div className="form-field">
        <label className="form-label">Accessibility</label>
        <div className="event-type-toggle">
          {["Delivered in BSL", "BSL/English Interpreter", "Captions"].map(option => (
            <button
              key={option}
              type="button"
              className={`event-type-btn${accessibility.includes(option) ? ' event-type-btn--active' : ''}`}
              onClick={() => toggleAccessibility(option)}
            >
              {option}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`accessibility-more-btn${showMoreAccessibility ? ' accessibility-more-btn--open' : ''}`}
          onClick={() => setShowMoreAccessibility(v => !v)}
        >
          <span className="accessibility-more-btn__arrow">{showMoreAccessibility ? '▾' : '▸'}</span>
          More accessibility options
        </button>
        {showMoreAccessibility && (
          <div className="accessibility-expanded">
            {Object.entries(ADVANCED_ACCESS_OPTIONS).map(([group, options]) => (
              <div key={group} className="accessibility-group">
                <span className="accessibility-group-label">{group}</span>
                <div className="event-type-toggle">
                  {options.map(option => (
                    <button
                      key={option}
                      type="button"
                      className={`event-type-btn${accessibility.includes(option) ? ' event-type-btn--active' : ''}`}
                      onClick={() => toggleAccessibility(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="accessibility-group">
              <span className="accessibility-group-label">Other</span>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. SubPac devices available"
                value={accessibilityOther}
                onChange={e => setAccessibilityOther(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

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
          onClick={handleSubmit}
          disabled={submitting || submitDisabled || !!(finishesAt && startsAt && finishesAt <= startsAt)}
          type="button"
        >
          {submitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </div>
  );
}