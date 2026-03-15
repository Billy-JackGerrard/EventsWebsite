import { useState, useEffect, useRef } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "../../supabaseClient";
import { expandRecurrences } from "../../utils/recurrence";
import type { RecurrenceRule } from "../../utils/recurrence";
import RecurrencePicker from "./RecurrencePicker";
import "./AddEvent.css";

declare global {
  interface Window {
    turnstile: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
    };
  }
}

/**
 * Returns "YYYY-MM-DDTHH:mm" for one hour ago, used as the `min` attribute
 * on the datetime-local inputs so past dates are greyed out and unselectable.
 */
const getMinDateTime = (): string => {
  const d = new Date(Date.now() - 60 * 60 * 1000);
  d.setSeconds(0, 0);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-") + "T" + [
    String(d.getHours()).padStart(2, "0"),
    String(d.getMinutes()).padStart(2, "0"),
  ].join(":");
};

const DEFAULT_RULE: RecurrenceRule = {
  frequency: "weekly",
  intervalMonths: 2,
  useWeekday: false,
};

export default function AddEvent() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [finishesAt, setFinishesAt] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [url, setUrl] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submittedCount, setSubmittedCount] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // Recurrence state
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule>(DEFAULT_RULE);

  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const minDateTime = getMinDateTime();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setIsAdmin(!!session);
      setAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setIsAdmin(!!session);
        setAuthChecked(true);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Load the Turnstile script and render the widget
  useEffect(() => {
    const scriptId = "cf-turnstile-script";

    const renderWidget = () => {
      if (turnstileRef.current && window.turnstile && !widgetIdRef.current) {
        widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
          sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
          callback: (token: string) => setTurnstileToken(token),
          "expired-callback": () => setTurnstileToken(null),
          "error-callback": () => setTurnstileToken(null),
          theme: "dark",
        });
      }
    };

    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
    } else if (window.turnstile) {
      renderWidget();
    }
  }, []);

  // Clear finish time if user changes start to something later
  const handleStartsAtChange = (value: string) => {
    setStartsAt(value);
    if (finishesAt && finishesAt <= value) {
      setFinishesAt("");
    }
  };

  const handleSubmit = async () => {
    if (!title || !startsAt) {
      setError("Please fill in at least a title and start time.");
      return;
    }

    if (finishesAt && new Date(finishesAt) <= new Date(startsAt)) {
      setError("The finish time must be after the start time.");
      return;
    }

    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!turnstileToken) {
      setError("Please complete the captcha check.");
      return;
    }

    setLoading(true);
    setError(null);

    // Verify the Turnstile token via the Edge Function
    const verifyRes = await fetch(import.meta.env.VITE_TURNSTILE_ENDPOINT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_KEY}`,
      },
      body: JSON.stringify({ turnstileToken }),
    });

    const verifyData = await verifyRes.json();

    if (!verifyData.success) {
      setError("Captcha verification failed. Please try again.");
      setTurnstileToken(null);
      if (widgetIdRef.current) window.turnstile.reset(widgetIdRef.current);
      setLoading(false);
      return;
    }

    // Captcha passed — build rows to insert
    const { data: { session } }: { data: { session: Session | null } } =
      await supabase.auth.getSession();
    const admin = !!session?.user;

    const firstStart: Date = new Date(startsAt);
    const firstFinish: Date | null = finishesAt ? new Date(finishesAt) : null;

    // Generate occurrences (single item if not recurring)
    const activeRule: RecurrenceRule = recurrenceEnabled
      ? recurrenceRule
      : { frequency: "none" };

    const occurrences = expandRecurrences(activeRule, firstStart, firstFinish);

    // If recurring, stamp all with the same recurrence_id
    const recurrenceId: string | null = recurrenceEnabled && occurrences.length > 1
      ? crypto.randomUUID()
      : null;

    const rows = occurrences.map(({ start, finish }: { start: Date; finish: Date | null }) => ({
      title,
      description: description || null,
      location: location || null,
      starts_at: start.toISOString(),
      finishes_at: finish ? finish.toISOString() : null,
      approved: admin,
      admin_id: admin ? session!.user.id : null,
      recurrence_id: recurrenceId,
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      url: url || null,
    }));

    const { error: insertError } = await supabase.from("events").insert(rows);

    if (insertError) {
      setError(insertError.message);
      if (widgetIdRef.current) window.turnstile.reset(widgetIdRef.current);
    } else {
      setSubmittedCount(rows.length);
      setSubmitted(true);
    }

    setLoading(false);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setLocation("");
    setStartsAt("");
    setFinishesAt("");
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setUrl("");
    setSubmitted(false);
    setSubmittedCount(1);
    setRecurrenceEnabled(false);
    setRecurrenceRule(DEFAULT_RULE);
    setTurnstileToken(null);
    widgetIdRef.current = null;
  };

  if (submitted) {
    const isRecurring = submittedCount > 1;
    return (
      <div className="addevent-page">
        <div className="addevent-card">
          <div className="addevent-success">
            <div className="addevent-success-icon">✓</div>
            <h2 className="addevent-title">
              {isRecurring ? "Recurring Event Added!" : "Event Added!"}
            </h2>
            <p className="addevent-success-msg">
              {isAdmin ? (
                isRecurring
                  ? `${submittedCount} occurrences have been published directly to the calendar.`
                  : "Your event has been published directly to the calendar."
              ) : (
                isRecurring
                  ? `Thank you! ${submittedCount} occurrences have been submitted and are awaiting approval from an admin.`
                  : "Thank you! Your event has been submitted and is awaiting approval from an admin."
              )}
            </p>
            <button className="addevent-btn" onClick={resetForm}>
              Add Another Event
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="addevent-page">
      <div className="addevent-card">
        <h2 className="addevent-title">Add an Event</h2>

        {authChecked && !isAdmin && (
          <p className="addevent-subtitle">
            Events are reviewed by an admin before appearing on the calendar.
          </p>
        )}

        {error && <div className="addevent-error">{error}</div>}

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

        {/* Recurrence picker */}
        <RecurrencePicker
          enabled={recurrenceEnabled}
          rule={recurrenceRule}
          startsAt={startsAt}
          onToggle={setRecurrenceEnabled}
          onRuleChange={setRecurrenceRule}
        />

        {/* Contact section */}
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

        <div className="addevent-row">
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
            <label className="addevent-label">Phone</label>
            <input
              className="addevent-input"
              type="tel"
              placeholder="e.g. 07700 900000"
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
            />
          </div>
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

        {/* Turnstile widget */}
        <div ref={turnstileRef} style={{ margin: "1rem 0" }} />

        <button className="addevent-btn" onClick={handleSubmit} disabled={loading || !turnstileToken}>
          {loading
            ? "Submitting…"
            : recurrenceEnabled
              ? "Add Recurring Event"
              : "Add Event"}
        </button>
      </div>
    </div>
  );
}