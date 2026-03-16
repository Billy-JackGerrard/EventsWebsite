import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { expandRecurrences, DEFAULT_RULE } from "../../utils/recurrence";
import type { RecurrenceRule } from "../../utils/recurrence";
import { isoToLocal } from "../../utils/dates";
import RecurrencePicker from "./RecurrencePicker";
import EventForm from "./EventForm";
import type { EventFormRow } from "./EventForm";
import type { Event } from "../../utils/types";
import EditEventScopePrompt from "./EditEventScopePrompt";
import type { RecurringScope } from "./EditEventScopePrompt";
import "./AddEvent.css";
import "./EditEvent.css";

type Props = {
  event: Event;
  onSaved: (updated: Event) => void;
  onCancel: () => void;
};

export default function EditEvent({ event, onSaved, onCancel }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [adminId, setAdminId] = useState<string | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setAdminId(user?.id));
  }, []);

  const [liveStartsAt, setLiveStartsAt] = useState<string>(() => isoToLocal(event.starts_at));

  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [recurrenceChanged, setRecurrenceChanged] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule>(DEFAULT_RULE);
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(true);

  const [pendingRow, setPendingRow] = useState<EventFormRow | null>(null);

  // ── Step 1: EventForm submits ─────────────────────────────────────────────

  const handleFormSubmit = (rows: EventFormRow[]) => {
    const row = rows[0];

    if (recurrenceChanged && event.recurrence) {
      applyRecurrenceChange(row);
    } else if (event.recurrence) {
      setPendingRow(row);
    } else {
      applyFieldEdit(row, "single");
    }
  };

  // ── Field-only edit ───────────────────────────────────────────────────────

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
      const { data: futures, error: fetchErr } = await supabase
        .from("events")
        .select("id, starts_at")
        .eq("recurrence->id", event.recurrence!.id)
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

  // ── Recurrence change ─────────────────────────────────────────────────────

  const applyRecurrenceChange = async (row: EventFormRow) => {
    if (!event.recurrence) {
      setError("Cannot change recurrence on a non-recurring event.");
      return;
    }

    setSaving(true);
    setError(null);

    // Delete all future occurrences in this series
    const { error: deleteErr } = await supabase
      .from("events")
      .delete()
      .eq("recurrence->id", event.recurrence.id)
      .gte("starts_at", event.starts_at);

    if (deleteErr) { setError(deleteErr.message); setSaving(false); return; }

    const activeRule: RecurrenceRule = recurrenceEnabled
      ? recurrenceRule
      : { frequency: "none" };

    const firstStart  = new Date(row.starts_at);
    const firstFinish = row.finishes_at ? new Date(row.finishes_at) : null;
    const occurrences = expandRecurrences(activeRule, firstStart, firstFinish);

    // Keep the same series id if still recurring, otherwise null out recurrence
    const newRecurrence: RecurrenceRule | null = occurrences.length > 1
      ? { ...activeRule, id: event.recurrence.id }
      : null;

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
      recurrence:     newRecurrence,
    }));

    const { data: inserted, error: insertErr } = await supabase
      .from("events")
      .insert(newRows)
      .select()
      .order("starts_at", { ascending: true });

    if (insertErr) { setError(insertErr.message); setSaving(false); return; }

    onSaved((inserted as Event[])[0]);
    setSaving(false);
  };

  // ── Scope prompt ──────────────────────────────────────────────────────────

  if (pendingRow) {
    return (
      <EditEventScopePrompt
        eventTitle={event.title}
        saving={saving}
        error={error}
        onChoose={(scope) => applyFieldEdit(pendingRow, scope)}
        onBack={() => setPendingRow(null)}
      />
    );
  }

  // ── Main edit form ────────────────────────────────────────────────────────

  return (
    <div className="addevent-page">
      <div className="addevent-card">
        <h2 className="addevent-title">Edit Event</h2>

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
          {event.recurrence && (
            <div className="editrecur-section">
              <div className="addevent-section-label addevent-section-label--centered">
                Recurrence
              </div>

              {!recurrenceOpen ? (
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
                    onToggle={(v) => { setRecurrenceEnabled(v); setRecurrenceChanged(true); }}
                    onRuleChange={(r) => { setRecurrenceRule(r); setRecurrenceChanged(true); }}
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