import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import "./AddEvent.css";

/**
 * Converts a datetime-local string ("YYYY-MM-DDTHH:mm") to a UTC ISO string.
 * The browser parses datetime-local values as local time, so new Date() on
 * that string correctly applies the user's timezone offset before .toISOString()
 * converts it to UTC — which is what Supabase's timestamptz column expects.
 */
const toUTCIso = (localDateTimeStr: string): string =>
  new Date(localDateTimeStr).toISOString();

export default function AddEvent() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [finishesAt, setFinishesAt] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [wasAdmin, setWasAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fix #2: Subscribe to auth state changes so isAdmin never goes stale
  // if the user logs in or out while this component is mounted.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async () => {
    if (!title || !startsAt) {
      setError("Please fill in at least a title and start time.");
      return;
    }

    setLoading(true);
    setError(null);

    // Fix #1: Fetch the user once and reuse it, rather than making a second
    // async call inside the insert — avoids a race condition where the session
    // could expire between the isAdmin check and the admin_id lookup.
    const { data: { user } } = await supabase.auth.getUser();
    const admin = !!user;

    const { error } = await supabase.from("events").insert({
      title,
      description: description || null,
      location: location || null,
      starts_at: toUTCIso(startsAt),
      finishes_at: finishesAt ? toUTCIso(finishesAt) : null,
      approved: admin,
      admin_id: admin ? user!.id : null,
    });

    if (error) {
      setError(error.message);
    } else {
      setWasAdmin(admin);
      setSubmitted(true);
    }

    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="addevent-page">
        <div className="addevent-card">
          <div className="addevent-success">
            <div className="addevent-success-icon">✓</div>
            <h2 className="addevent-title">Event Added!</h2>
            <p className="addevent-success-msg">
              {wasAdmin
                ? "Your event has been published directly to the calendar."
                : "Thank you! Your event has been submitted and is awaiting approval from an admin."}
            </p>
            <button className="addevent-btn" onClick={() => setSubmitted(false)}>
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
        {!isAdmin && (
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
              value={startsAt}
              onChange={e => setStartsAt(e.target.value)}
            />
          </div>

          <div className="addevent-field">
            <label className="addevent-label">Finishes At</label>
            <input
              className="addevent-input"
              type="datetime-local"
              value={finishesAt}
              onChange={e => setFinishesAt(e.target.value)}
            />
          </div>
        </div>

        <button className="addevent-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? "Submitting…" : "Add Event"}
        </button>
      </div>
    </div>
  );
}