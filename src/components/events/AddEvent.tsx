import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../supabaseClient";
import { useTurnstile } from "../../hooks/useTurnstile";
import EventForm from "./EventForm";
import type { EventFormRow } from "./EventForm";
import type { Event } from "../../utils/types";
import { scaleSpring } from "../../utils/motion";
import "./shared-card.css";
import "./AddEvent.css";

type Props = {
  prefillDate?: string; // "YYYY-MM-DD" — pre-populates the start date when adding from calendar
  prefillEvent?: Event;  // pre-populates all fields when duplicating an event
  isAdmin?: boolean;
  onBrowse?: () => void;
};

export default function AddEvent({ prefillDate, prefillEvent, isAdmin = false, onBrowse }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [submittedCount, setSubmittedCount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const { containerRef: turnstileRef, token: turnstileToken, reset: resetTurnstile } =
    useTurnstile(import.meta.env.VITE_TURNSTILE_SITE_KEY as string, formKey);

  const handleSubmit = async (rows: EventFormRow[]) => {
    setLoading(true);
    setError(null);

    // Admins bypass captcha — they're already authenticated
    if (!isAdmin) {
      if (!turnstileToken) {
        setError("Please complete the captcha check.");
        setLoading(false);
        return;
      }

      let verifyRes: Response;
      try {
        verifyRes = await fetch(import.meta.env.VITE_TURNSTILE_ENDPOINT_URL as string, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_KEY as string}`,
          },
          body: JSON.stringify({ turnstileToken }),
        });
      } catch {
        setError("Network error — please check your connection and try again.");
        resetTurnstile();
        setLoading(false);
        return;
      }

      if (!verifyRes.ok) {
        setError("Captcha verification failed. Please try again.");
        resetTurnstile();
        setLoading(false);
        return;
      }

      const verifyData = await verifyRes.json();

      if (!verifyData.success) {
        setError("Captcha verification failed. Please try again.");
        resetTurnstile();
        setLoading(false);
        return;
      }
    }

    // Fetch session only to get the user ID for admin_id
    const { data: { session } } = await supabase.auth.getSession();

    // All occurrences are inserted upfront. For non-admins they are all
    // unapproved — the queue deduplicates by recurrence_id so only the first
    // shows up for review, and approval sets the whole series to approved in
    // one query.
    const rowsWithMeta = rows.map(row => ({
      ...row,
      approved: isAdmin,
      admin_id: isAdmin ? (session?.user?.id ?? null) : null,
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
    setFormKey(k => k + 1);
  };

  if (submitted) {
    const isRecurring = submittedCount > 1;
    return (
      <div className="addevent-page">
        <div className="page-card addevent-card">
          <div className="addevent-success">
            <motion.div
              className="addevent-success-icon"
              animate={{ scale: [0, 1.15, 1], opacity: [0, 1, 1] }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >✓</motion.div>
            <h2 className="addevent-title">
              {isRecurring ? "Recurring Event Submitted!" : "Event Added!"}
            </h2>
            <p className="addevent-success-msg">
              {isAdmin ? (
                isRecurring
                  ? `${submittedCount} occurrences have been published directly to the calendar.`
                  : "Your event has been published directly to the calendar."
              ) : (
                isRecurring
                  ? `Thank you! Your recurring event has been submitted for review. Once approved, all ${submittedCount} dates will appear on the calendar.`
                  : "Thank you! Your event has been submitted and is awaiting approval from an admin."
              )}
            </p>
            <div className="addevent-success-actions">
              <motion.button className="btn-primary" onClick={resetForm} whileTap={scaleSpring.tap}>
                Add Another Event
              </motion.button>
              {onBrowse && (
                <motion.button className="btn-secondary" onClick={onBrowse} whileTap={scaleSpring.tap}>
                  Browse Events
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="addevent-page">
      <div className="page-card addevent-card">
        <h2 className="addevent-title">Add an Event</h2>

        {!isAdmin && (
          <p className="addevent-subtitle">
            Events are reviewed by an admin before appearing on the calendar.
          </p>
        )}

        <EventForm
          key={formKey}
          initialValues={prefillEvent}
          prefillDate={prefillDate}
          showRecurrence={true}
          submitLabel="Add Event"
          submittingLabel="Submitting…"
          externalError={error}
          submitting={loading}
          submitDisabled={!isAdmin && !turnstileToken}
          onSubmit={handleSubmit}
        >
          {!isAdmin && <div ref={turnstileRef} style={{ margin: "1rem 0" }} />}
        </EventForm>
      </div>
    </div>
  );
}