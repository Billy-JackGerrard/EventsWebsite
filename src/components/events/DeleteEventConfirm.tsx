import { useState } from "react";
import { supabase } from "../../supabaseClient";
import type { Event } from "../../utils/types";
import "./shared-card.css";
import "./EditEvent.css";

type Props = {
  event: Event;
  onDeleted: () => void;
  onCancel: () => void;
};

export default function DeleteEventConfirm({ event, onDeleted, onCancel }: Props) {
  const isRecurring = !!event.recurrence?.id;
  const [step, setStep] = useState<"scope" | "confirm" | "deleting">(
    isRecurring ? "scope" : "confirm"
  );
  const [scope, setScope] = useState<"single" | "all-future">("single");
  const [error, setError] = useState<string | null>(null);

  const handleScopeChoose = (chosen: "single" | "all-future") => {
    setScope(chosen);
    setStep("confirm");
  };

  const handleConfirm = async () => {
    setStep("deleting");
    setError(null);

    const query =
      scope === "all-future" && event.recurrence?.id
        ? supabase
            .from("events")
            .delete()
            .eq("recurrence->>id", event.recurrence.id)
            .gte("starts_at", event.starts_at)
        : supabase.from("events").delete().eq("id", event.id);

    const { error: err } = await query;
    if (err) {
      setError("Failed to delete: " + err.message);
      setStep("confirm");
      return;
    }
    onDeleted();
  };

  if (step === "scope") {
    return (
      <div className="addevent-page">
        <div className="addevent-card">
          <h2 className="addevent-title">Delete Recurring Event</h2>
          <p className="editrecur-question">
            <strong style={{ color: "var(--color-text-error)" }}>{event.title}</strong> is part
            of a recurring series. Which occurrences do you want to delete?
          </p>
          <div className="editrecur-choices">
            <button
              className="editrecur-choice-btn"
              onClick={() => handleScopeChoose("single")}
            >
              <span className="editrecur-choice-title">Just this event</span>
              <span className="editrecur-choice-desc">Only delete this single occurrence</span>
            </button>
            <button
              className="editrecur-choice-btn editrecur-choice-btn--secondary"
              onClick={() => handleScopeChoose("all-future")}
            >
              <span className="editrecur-choice-title">This &amp; all future events</span>
              <span className="editrecur-choice-desc">Delete this occurrence and all that follow it</span>
            </button>
          </div>
          <button className="editrecur-back-btn" onClick={onCancel}>
            ← Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="addevent-page">
      <div className="addevent-card">
        <h2 className="addevent-title">Confirm Delete</h2>
        <p className="editrecur-question">
          Are you sure you want to permanently delete{" "}
          <strong style={{ color: "var(--color-text-error)" }}>{event.title}</strong>?
          {scope === "all-future" && (
            <> This will remove <strong>this and all future occurrences</strong>.</>
          )}
        </p>
        {error && <div className="addevent-error">{error}</div>}
        <div className="editrecur-choices">
          <button
            className="delete-confirm-btn"
            onClick={handleConfirm}
            disabled={step === "deleting"}
          >
            {step === "deleting" ? (
              <span className="btn-loading">
                <span className="btn-spinner" aria-hidden="true" />
                Deleting…
              </span>
            ) : "Yes, delete permanently"}
          </button>
        </div>
        <button
          className="editrecur-back-btn"
          onClick={isRecurring ? () => setStep("scope") : onCancel}
          disabled={step === "deleting"}
        >
          ← {isRecurring ? "Back" : "Cancel"}
        </button>
      </div>
    </div>
  );
}
