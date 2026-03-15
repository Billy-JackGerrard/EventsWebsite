import { useState, useEffect } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "../../supabaseClient";
import { useTurnstile } from "../../hooks/useTurnstile";
import EventForm from "./EventForm";
import type { EventFormRow } from "./EventForm";
import "./AddEvent.css";

export default function AddEvent() {
  const [submitted, setSubmitted] = useState(false);
  const [submittedCount, setSubmittedCount] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const { containerRef: turnstileRef, token: turnstileToken, reset: resetTurnstile } =
    useTurnstile(import.meta.env.VITE_TURNSTILE_SITE_KEY, formKey);

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

  const handleSubmit = async (rows: EventFormRow[]) => {
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
      resetTurnstile();
      setLoading(false);
      return;
    }

    const { data: { session } }: { data: { session: Session | null } } =
      await supabase.auth.getSession();
    const admin = !!session?.user;

    const rowsWithMeta = rows.map(row => ({
      ...row,
      approved: admin,
      admin_id: admin ? session!.user.id : null,
    }));

    const { error: insertError } = await supabase.from("events").insert(rowsWithMeta);

    if (insertError) {
      setError(insertError.message);
      resetTurnstile();
    } else {
      setSubmittedCount(rows.length);
      setSubmitted(true);
    }

    setLoading(false);
  };

  const resetForm = () => {
    setSubmitted(false);
    setSubmittedCount(1);
    setError(null);
    setFormKey(k => k + 1); // remounts EventForm and re-renders Turnstile via formKey
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

        <EventForm
          key={formKey}
          showRecurrence={true}
          submitLabel="Add Event"
          submittingLabel="Submitting…"
          externalError={error}
          submitting={loading || !turnstileToken}
          onSubmit={handleSubmit}
        >
          {/* Turnstile widget container — managed by useTurnstile */}
          <div ref={turnstileRef} style={{ margin: "1rem 0" }} />
        </EventForm>
      </div>
    </div>
  );
}