import { useState } from "react";
import "./shared-card.css";
import "./EditEvent.css";

export type RecurringScope = "single" | "all-future";

type Props = {
  eventTitle: string;
  saving: boolean;
  error: string | null;
  onChoose: (scope: RecurringScope) => void;
  onBack: () => void;
};

export default function EditEventScopePrompt({ eventTitle, saving, error, onChoose, onBack }: Props) {
  const [chosen, setChosen] = useState<RecurringScope | null>(null);

  const handleChoose = (scope: RecurringScope) => {
    setChosen(scope);
    onChoose(scope);
  };

  const btnClass = (scope: RecurringScope) => {
    if (chosen === null) {
      // Nothing chosen yet — both look equal/neutral
      return "editrecur-choice-btn editrecur-choice-btn--secondary";
    }
    // After choosing, highlight the chosen one and dim the other
    return chosen === scope
      ? "editrecur-choice-btn"
      : "editrecur-choice-btn editrecur-choice-btn--secondary editrecur-choice-btn--unchosen";
  };

  return (
    <div className="addevent-page">
      <div className="addevent-card">
        <h2 className="addevent-title">Edit Recurring Event</h2>

        <p className="editrecur-question">
          <strong style={{ color: "var(--color-accent)" }}>{eventTitle}</strong> is part
          of a recurring series. Which occurrences do you want to update?
        </p>

        {error && <div className="addevent-error">{error}</div>}

        <div className="editrecur-choices">
          <button
            className={btnClass("single")}
            onClick={() => handleChoose("single")}
            disabled={saving}
          >
            <span className="editrecur-choice-title">
              {saving && chosen === "single" ? (
                <span className="btn-loading"><span className="btn-spinner" aria-hidden="true" />Saving…</span>
              ) : "Just this event"}
            </span>
            <span className="editrecur-choice-desc">Only update this single occurrence</span>
          </button>

          <button
            className={btnClass("all-future")}
            onClick={() => handleChoose("all-future")}
            disabled={saving}
          >
            <span className="editrecur-choice-title">
              {saving && chosen === "all-future" ? (
                <span className="btn-loading"><span className="btn-spinner" aria-hidden="true" />Saving…</span>
              ) : "This & all future events"}
            </span>
            <span className="editrecur-choice-desc">Update this occurrence and all that follow it</span>
          </button>
        </div>

        <button className="editrecur-back-btn" onClick={onBack} disabled={saving}>
          ← Back to edit
        </button>
      </div>
    </div>
  );
}