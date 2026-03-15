import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import "./AddEvent.css";

declare global {
  interface Window {
    turnstile: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
    };
  }
}

const toUTCIso = (localDateTimeStr: string): string =>
  new Date(localDateTimeStr).toISOString();

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

const isValidEmail = (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isValidPhone = (v: string) => !v || /^[+\d\s\-().]{7,20}$/.test(v);
const isValidUrl   = (v: string) => {
  if (!v) return true;
  try { new URL(v.startsWith("http") ? v : `https://${v}`); return true; }
  catch { return false; }
};

export default function AddEvent() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [finishesAt, setFinishesAt] = useState("");

  // Contact fields
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [eventUrl, setEventUrl] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const minDateTime = getMinDateTime();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(!!session);
      setAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session);
      setAuthChecked(true);
    });

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

    if (!isValidEmail(contactEmail)) {
      setError("Please enter a valid email address, or leave it blank.");
      return;
    }

    if (!isValidPhone(contactPhone)) {
      setError("Please enter a valid phone number, or leave it blank.");
      return;
    }

    if (!isValidUrl(eventUrl)) {
      setError("Please enter a valid URL (e.g. https://example.com), or leave it blank.");
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

    // Normalise URL — ensure it has a scheme
    const normUrl = eventUrl && !eventUrl.startsWith("http")
      ? `https://${eventUrl}`
      : eventUrl || null;

    // Captcha passed — insert the event
    const { data: { session } } = await supabase.auth.getSession();
    const admin = !!session?.user;

    const { error } = await supabase.from("events").insert({
      title,
      description: description || null,
      location: location || null,
      starts_at: toUTCIso(startsAt),
      finishes_at: finishesAt ? toUTCIso(finishesAt) : null,
      approved: admin,
      admin_id: admin ? session!.user.id : null,
      contact_name:  contactName  || null,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      url:   normUrl,
    });

    if (error) {
      setError(error.message);
      if (widgetIdRef.current) window.turnstile.reset(widgetIdRef.current);
    } else {
      setSubmitted(true);
    }

    setLoading(false);
  };

  const resetForm = () => {
    setTitle(""); setDescription(""); setLocation("");
    setStartsAt(""); setFinishesAt("");
    setContactName(""); setContactEmail("");
    setContactPhone(""); setEventUrl("");
    setSubmitted(false);
    setTurnstileToken(null);
    widgetIdRef.current = null;
  };

  if (submitted) {
    return (
      <div className="addevent-page">
        <div className="addevent-card">
          <div className="addevent-success">
            <div className="addevent-success-icon">✓</div>
            <h2 className="addevent-title">Event Added!</h2>
            <p className="addevent-success-msg">
              {isAdmin
                ? "Your event has been published directly to the calendar."
                : "Thank you! Your event has been submitted and is awaiting approval from an admin."}
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

        {/* Contact section */}
        <div className="addevent-section-label">Contact Info <span className="addevent-section-optional">(optional)</span></div>

        <div className="addevent-row">
          <div className="addevent-field">
            <label className="addevent-label">Name</label>
            <input
              className="addevent-input"
              type="text"
              placeholder="e.g. Jamie"
              value={contactName}
              onChange={e => setContactName(e.target.value)}
            />
          </div>

          <div className="addevent-field">
            <label className="addevent-label">Phone</label>
            <input
              className="addevent-input"
              type="tel"
              placeholder="e.g. 07700 900123"
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
            />
          </div>
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
          <label className="addevent-label">Even Website or Booking Link</label>
          <input
            className="addevent-input"
            type="url"
            placeholder="e.g. https://eventbrite.com/…"
            value={eventUrl}
            onChange={e => setEventUrl(e.target.value)}
          />
        </div>

        {/* Turnstile widget */}
        <div ref={turnstileRef} style={{ margin: "1rem 0" }} />

        <button className="addevent-btn" onClick={handleSubmit} disabled={loading || !turnstileToken}>
          {loading ? "Submitting…" : "Add Event"}
        </button>
      </div>
    </div>
  );
}