import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { expandRecurrences, DEFAULT_RULE } from "../../utils/recurrence";
import type { RecurrenceRule } from "../../utils/recurrence";
import { isoToLocal } from "../../utils/dates";
import RecurrencePicker from "./RecurrencePicker";
import EventForm from "./EventForm";
import type { EventFormRow } from "./EventForm";
import type { Event } from "../../utils/types";
import "./AddEvent.css";
import "./EditEvent.css";

type Props = {
  event: Event;
  onSaved: (updated: Event) => void;
  onCancel: () => void;
};

type RecurringScope = "single" | "all-future";

export default function EditEvent({ event, onSaved, onCancel }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch the admin user id once on mount rather than on every save (#11)
  const [adminId, setAdminId] = useState<string | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAdminId(user?.id);
    });
  }, []);

  // Tracks the form's current starts_at so RecurrencePicker always reflects the live date
  const [liveStartsAt, setLiveStartsAt] = useState<string>(() => isoToLocal(event.starts_at));

  // Recurrence editing — only relevant when event.recurrence_id is set
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [recurrenceChanged, setRecurrenceChanged] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule>(DEFAULT_RULE);
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(true);

  // For field edits on recurring events: hold the validated row while we ask scope
  const [pendingRow, setPendingRow] = useState<EventFormRow | null>(null);

  // ── Step 1: EventForm submits ─────────────────────────────────────

  const handleFormSubmit = (rows: EventFormRow[]) => {
    const row = rows[0]; // showRecurrence=false, always one row

    if (recurrenceChanged) {
      // Recurrence changed → delete future + regenerate, no scope prompt needed
      applyRecurrenceChange(row);
    } else if (event.recurrence_id) {
      // Field-only change on a recurring event → ask scope
      setPendingRow(row);
    } else {
      // Non-recurring single event → just patch it
      applyFieldEdit(row, "single");
    }
  };

  // ── Field-only edit (patch existing rows) ────────────────────────

  const buildPatch = (row: EventFormRow) => ({
    title:         row.title,
    description:   row.description,
    location:      row.location,
    starts_at:     row.starts_at,
    finishes_at:   row.finishes_at,
    contact_name:  row.contact_name,
    contact_email: row.contact_email,
    url:           row.url,
    whatsapp_url:  row.whatsapp_url,
    price:         row.price,
    booking_info:  row.booking_info,
    admin_id:      adminId,
  });

  const applyFieldEdit = async (row: EventFormRow, scope: RecurringScope) => {
    setSaving(true);
    setError(null);
    const patch = buildPatch(row);

    if (scope === "single") {
      const { data, error: err } = await supabase
        .from("events")
        .update(patch)
        .eq("id", event.id)
        .select()
        .single();

      if (err) { setError(err.message); setSaving(false); return; }
      onSaved(data as Event);

    } else {
      // Fetch all future occurrences in the recurrence group
      const { data: futures, error: fetchErr } = await supabase
        .from("events")
        .select("id, starts_at, finishes_at")
        .eq("recurrence_id", event.recurrence_id!)
        .gte("starts_at", event.starts_at);

      if (fetchErr) { setError(fetchErr.message); setSaving(false); return; }

      const origStart  = new Date(event.starts_at).getTime();
      const newStart   = new Date(row.starts_at).getTime();
      const startDelta = newStart - origStart;
      const duration   = row.finishes_at
        ? new Date(row.finishes_at).getTime() - newStart
        : null;

      const patchPromises = (futures ?? []).map(
        (future: { id: string; starts_at: string }) => {
          const futureStart   = new Date(future.starts_at).getTime();
          const shiftedStart  = new Date(futureStart + startDelta).toISOString();
          const shiftedFinish = duration !== null
            ? new Date(futureStart + startDelta + duration).toISOString()
            : null;
          return supabase
            .from("events")
            .update({ ...patch, starts_at: shiftedStart, finishes_at: shiftedFinish })
            .eq("id", future.id);
        }
      );

      const results  = await Promise.all(patchPromises);
      const firstErr = results.find(r => r.error)?.error;
      if (firstErr) { setError(firstErr.message); setSaving(false); return; }

      const { data: refreshed } = await supabase
        .from("events").select("*").eq("id", event.id).single();
      onSaved(refreshed as Event);
    }

    setSaving(false);
  };

  // ── Recurrence change (delete future + regenerate) ───────────────

  const applyRecurrenceChange = async (row: EventFormRow) => {
    setSaving(true);
    setError(null);

    // 1. Delete all future occurrences in this recurrence group
    const { error: deleteErr } = await supabase
      .from("events")
      .delete()
      .eq("recurrence_id", event.recurrence_id!)
      .gte("starts_at", event.starts_at);

    if (deleteErr) { setError(deleteErr.message); setSaving(false); return; }

    // 2. Expand the new rule from the edited start time.
    //    Fix: when recurrenceEnabled is false the user toggled recurrence off,
    //    so we use frequency "none" to produce a single occurrence rather than
    //    expanding with whatever rule happens to be set.
    const activeRule: RecurrenceRule = recurrenceEnabled
      ? recurrenceRule
      : { frequency: "none" };

    const firstStart  = new Date(row.starts_at);
    const firstFinish = row.finishes_at ? new Date(row.finishes_at) : null;
    const occurrences = expandRecurrences(activeRule, firstStart, firstFinish);

    // 3. Assign a new recurrence_id (the old one is now orphaned / partly used
    //    by past events). Only set one when there are multiple occurrences.
    const newRecurrenceId = occurrences.length > 1 ? crypto.randomUUID() : null;

    const newRows = occurrences.map(({ start, finish }) => ({
      title:          row.title,
      description:    row.description,
      location:       row.location,
      starts_at:      start.toISOString(),
      finishes_at:    finish ? finish.toISOString() : null,
      contact_name:   row.contact_name,
      contact_email:  row.contact_email,
      url:            row.url,
      whatsapp_url:   row.whatsapp_url,
      price:          row.price,
      booking_info:   row.booking_info,
      approved:       true,
      admin_id:       adminId,
      recurrence_id:  newRecurrenceId,
    }));

    const { data: inserted, error: insertErr } = await supabase
      .from("events")
      .insert(newRows)
      .select()
      .order("starts_at", { ascending: true });

    if (insertErr) { setError(insertErr.message); setSaving(false); return; }

    // Return the first inserted occurrence as the "updated" event
    onSaved((inserted as Event[])[0]);
    setSaving(false);
  };

  // ── Scope prompt (field-only edit on recurring event) ────────────

  if (pendingRow) {
    return (
      <div className="addevent-page">
        <div className="addevent-card">
          <h2 className="addevent-title">Edit Recurring Event</h2>

          <p className="editrecur-question">
            <strong style={{ color: "var(--color-accent)" }}>{event.title}</strong> is part
            of a recurring series. Which occurrences do you want to update?
          </p>

          {error && <div className="addevent-error">{error}</div>}

          <div className="editrecur-choices">
            <button
              className="editrecur-choice-btn"
              onClick={() => applyFieldEdit(pendingRow, "single")}
              disabled={saving}
            >
              <span className="editrecur-choice-title">
                {saving ? "Saving…" : "Just this event"}
              </span>
              <span className="editrecur-choice-desc">Only update this single occurrence</span>
            </button>

            <button
              className="editrecur-choice-btn editrecur-choice-btn--secondary"
              onClick={() => applyFieldEdit(pendingRow, "all-future")}
              disabled={saving}
            >
              <span className="editrecur-choice-title">
                {saving ? "Saving…" : "This & all future events"}
              </span>
              <span className="editrecur-choice-desc">Update this occurrence and all that follow it</span>
            </button>
          </div>

          <button className="editrecur-back-btn" onClick={() => setPendingRow(null)} disabled={saving}>
            ← Back to edit
          </button>
        </div>
      </div>
    );
  }

  // ── Main edit form ────────────────────────────────────────────────

  return (
    <div className="addevent-page">
      <div className="addevent-card">
        <h2 className="addevent-title">Edit Event</h2>

        {/* Main fields */}
        <EventForm
          initialValues={event}
          showRecurrence={false}
          submitLabel="Save Changes"
          submittingLabel="Saving…"
          externalError={error}
          submitting={saving}
          onSubmit={handleFormSubmit}
          onCancel={onCancel}
          onStartsAtChange={setLiveStartsAt}
        >
          {/* Recurrence section — only for recurring events */}
          {event.recurrence_id && (
            <div className="editrecur-section">
              <div className="addevent-section-label addevent-section-label--centered">
                Recurrence
              </div>

              {!recurrenceOpen ? (
                // Read-only summary + change button
                <div className="editrecur-summary">
                  <span className="editrecur-summary-icon">↻</span>
                  <span className="editrecur-summary-text">This is a recurring event</span>
                  <button
                    className="editrecur-change-btn"
                    type="button"
                    onClick={() => setRecurrenceOpen(true)}
                  >
                    Change recurrence…
                  </button>
                </div>
              ) : (
                // Picker open
                <div className="editrecur-picker-wrap">
                  {!recurrenceChanged && (
                    <div className="editrecur-picker-note">
                      ⚠ Changing the recurrence will delete all future occurrences and regenerate them from the new pattern.
                    </div>
                  )}
                  <RecurrencePicker
                    enabled={recurrenceEnabled}
                    rule={recurrenceRule}
                    startsAt={liveStartsAt}
                    onToggle={(v) => {
                      setRecurrenceEnabled(v);
                      setRecurrenceChanged(true);
                    }}
                    onRuleChange={(r) => {
                      setRecurrenceRule(r);
                      setRecurrenceChanged(true);
                    }}
                  />

                  {recurrenceChanged && (
                    <div className="editrecur-changed-badge">
                      ✓ Recurrence will be updated on save
                    </div>
                  )}

                  <button
                    className="editrecur-back-btn"
                    type="button"
                    onClick={() => {
                      setRecurrenceOpen(false);
                      setRecurrenceChanged(false);
                      setRecurrenceRule(DEFAULT_RULE);
                      setRecurrenceEnabled(true);
                    }}
                  >
                    ← Cancel recurrence change
                  </button>
                </div>
              )}
            </div>
          )}
        </EventForm>
      </div>
    </div>
  );
}