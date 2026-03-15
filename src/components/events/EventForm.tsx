import { useState, useEffect, useRef } from "react";
import { expandRecurrences, DEFAULT_RULE } from "../../utils/recurrence";
import type { RecurrenceRule } from "../../utils/recurrence";
import { isoToLocal, getMinDateTime } from "../../utils/dates";
import type { Event } from "../../utils/types";
import RecurrencePicker from "./RecurrencePicker";

// Re-export so AddEvent/EditEvent don't need to import recurrence directly
export type { RecurrenceRule };

export type EventFormRow = {
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  finishes_at: string | null;
  contact_name: string | null;
  contact_email: string | null;
  url: string | null;
  whatsapp_url: string | null;
  price: string | null;
  booking_info: string | null;
  recurrence_id: string | null;
};

type Props = {
  /** Pre-fill from an existing event (edit mode). Leave undefined for add mode. */
  initialValues?: Event;
  /** Whether to show the recurrence picker (hide in edit mode). */
  showRecurrence?: boolean;
  /** Label shown on the submit button */
  submitLabel: string;
  /** Label shown while submitting */
  submittingLabel: string;
  /** External error to display (e.g. from Supabase) */
  externalError?: string | null;
  /** Whether form is submitting (controls button disabled state alongside internal validation) */
  submitting?: boolean;
  /**
   * Called with the expanded rows when the form passes validation.
   * The caller is responsible for the actual Supabase call.
   */
  onSubmit: (rows: EventFormRow[]) => void;
  /** Optional cancel button — shown when provided */
  onCancel?: () => void;
  /** Called whenever the starts_at field changes — lets parents (e.g. EditEvent) track the live value */
  onStartsAtChange?: (value: string) => void;
  /** Extra content rendered below the fields but above the submit button (e.g. Turnstile) */
  children?: React.ReactNode;
};

export default function EventForm({
  initialValues,
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
  const [startsAt, setStartsAt] = useState(initialValues?.starts_at ? isoToLocal(initialValues.starts_at) : "");
  const [finishesAt, setFinishesAt] = useState(initialValues?.finishes_at ? isoToLocal(initialValues.finishes_at) : "");
  const [contactName, setContactName] = useState(initialValues?.contact_name ?? "");
  const [contactEmail, setContactEmail] = useState(initialValues?.contact_email ?? "");
  const [url, setUrl] = useState(initialValues?.url ?? "");
  const [whatsappUrl, setWhatsappUrl] = useState(initialValues?.whatsapp_url ?? "");
  const [price, setPrice] = useState(initialValues?.price ?? "");
  const [bookingInfo, setBookingInfo] = useState(initialValues?.booking_info ?? "");
  const [internalError, setInternalError] = useState<string | null>(null);

  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule>(DEFAULT_RULE);

  // Track whether initialValues changed (e.g. switching which event is being edited)
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
      setWhatsappUrl(initialValues.whatsapp_url ?? "");
      setPrice(initialValues.price ?? "");
      setBookingInfo(initialValues.booking_info ?? "");
      setRecurrenceEnabled(false);
      setRecurrenceRule(DEFAULT_RULE);
      setInternalError(null);
    }
  }, [initialValues]);

  const minDateTime = getMinDateTime();

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
    if (finishesAt && new Date(finishesAt) <= new Date(startsAt)) {
      setInternalError("The finish time must be after the start time.");
      return;
    }
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      setInternalError("Please enter a valid email address.");
      return;
    }
    if (whatsappUrl && !whatsappUrl.includes("chat.whatsapp.com")) {
      setInternalError("Please enter a valid WhatsApp group chat link (chat.whatsapp.com/…).");
      return;
    }

    const firstStart = new Date(startsAt);
    const firstFinish = finishesAt ? new Date(finishesAt) : null;

    const activeRule: RecurrenceRule = showRecurrence && recurrenceEnabled
      ? recurrenceRule
      : { frequency: "none" };

    const occurrences = expandRecurrences(activeRule, firstStart, firstFinish);

    const recurrenceId: string | null =
      showRecurrence && recurrenceEnabled && occurrences.length > 1
        ? crypto.randomUUID()
        : null;

    const rows: EventFormRow[] = occurrences.map(({ start, finish }) => ({
      title,
      description: description || null,
      location: location || null,
      starts_at: start.toISOString(),
      finishes_at: finish ? finish.toISOString() : null,
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      url: url || null,
      whatsapp_url: whatsappUrl || null,
      price: price || null,
      booking_info: bookingInfo || null,
      recurrence_id: recurrenceId,
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
          placeholder="e.g. Blackwood Bar"
          value={location}
          onChange={e => setLocation(e.target.value)}
        />
      </div>

      <div className="addevent-row">
        <div className="addevent-field">
          <label className="addevent-label">Starts At *</label>
          <input
            className="addevent-input"
            type="datetime-local"
            min={minDateTime}
            value={startsAt}
            onChange={e => handleStartsAtChange(e.target.value)}
          />
        </div>
        <div className="addevent-field">
          <label className="addevent-label">Finishes At</label>
          <input
            className="addevent-input"
            type="datetime-local"
            min={startsAt || minDateTime}
            value={finishesAt}
            onChange={e => setFinishesAt(e.target.value)}
          />
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

      <div className="addevent-row">
        <div className="addevent-field">
          <label className="addevent-label">Price</label>
          <input
            className="addevent-input"
            type="text"
            placeholder="e.g. Free, £5, £3–£8"
            value={price}
            onChange={e => setPrice(e.target.value)}
          />
        </div>
        <div className="addevent-field">
          <label className="addevent-label">How to Book</label>
          <input
            className="addevent-input"
            type="text"
            placeholder="e.g. Just turn up"
            value={bookingInfo}
            onChange={e => setBookingInfo(e.target.value)}
          />
        </div>
      </div>

      <div className="addevent-section-label addevent-section-label--centered">
        Contact Info <span className="addevent-section-optional">(optional)</span>
        <div className="addevent-hint">Visible publicly on the event listing</div>
      </div>

      <div className="addevent-field">
        <label className="addevent-label">Name</label>
        <input
          className="addevent-input"
          type="text"
          placeholder="e.g. Jane Smith"
          value={contactName}
          onChange={e => setContactName(e.target.value)}
        />
      </div>

      <div className="addevent-field">
        <label className="addevent-label">Email</label>
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

      <div className="addevent-field">
        <label className="addevent-label">WhatsApp Group Chat</label>
        <input
          className="addevent-input"
          type="url"
          placeholder="e.g. https://chat.whatsapp.com/..."
          value={whatsappUrl}
          onChange={e => setWhatsappUrl(e.target.value)}
        />
      </div>

      {/* Slot for Turnstile or other caller-provided content */}
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