import { useState } from "react";
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
  /** When set, skips the scope prompt and applies this scope automatically.
   *  Pass "all-future" when editing from the admin queue. */
  defaultRecurringScope?: RecurringScope;
};

export default function EditEvent({ event, onSaved, onCancel, defaultRecurringScope }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [liveStartsAt, setLiveStartsAt] = useState<string>(() => isoToLocal(event.starts_at));

  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [recurrenceChanged, setRecurrenceChanged] = useState(false);

  // Initialise from the event's existing rule so the picker is pre-populated
  // when the user opens "Change recurrence…" rather than starting from DEFAULT_RULE.
  const existingRule: RecurrenceRule = event.recurrence ?? DEFAULT_RULE;
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule>(existingRule);
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(!!event.recurrence);

  const [pendingRow, setPendingRow] = useState<EventFormRow | null>(null);

  // ── Resolve admin id at save time to avoid race on mount ─────────────────

  const getAdminId = async (): Promise<string | undefined> => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  };

  // ── Step 1: EventForm submits ─────────────────────────────────────────────

  const handleFormSubmit = (rows: EventFormRow[]) => {
    const row = rows[0];

    if (recurrenceChanged && event.recurrence) {
      applyRecurrenceChange(row);
    } else if (event.recurrence) {
      if (defaultRecurringScope) {
        // Skip the scope prompt — caller has already decided (e.g. admin queue).
        applyFieldEdit(row, defaultRecurringScope);
      } else {
        setPendingRow(row);
      }
    } else {
      applyFieldEdit(row, "single");
    }
  };

  // ── Field-only edit ───────────────────────────────────────────────────────

  const buildPatch = async (row: EventFormRow) => ({
    title:         row.title,
    category:      row.category,
    description:   row.description,
    event_type:    row.event_type,
    location:      row.location,
    postcode:      row.postcode,
    starts_at:     row.starts_at,
    finishes_at:   row.finishes_at,
    contact_name:  row.contact_name,
    contact_email: row.contact_email,
    url:           row.url,
    price:         row.price,
    booking_info:  row.booking_info,
    accessibility: row.accessibility,
    admin_id:      await getAdminId(),
  });

  const applyFieldEdit = async (row: EventFormRow, scope: RecurringScope) => {
    setSaving(true);
    setError(null);
    const patch = await buildPatch(row);

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
      // Fetch all future occurrences using the original starts_at so we
      // correctly identify which rows to update regardless of any time shift
      // the user may have applied.
      const { data: futures, error: fetchErr } = await supabase
        .from("events")
        .select("id, starts_at")
        .eq("recurrence->>id", event.recurrence!.id)
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

      const results = await Promise.all(patchPromises);
      const firstErr = results.find(r => r.error)?.error;
      if (firstErr) { setError(firstErr.message); setSaving(false); return; }

      // Re-fetch the current event to return the updated version.
      const { data: updated, error: refetchErr } = await supabase
        .from("events")
        .select()
        .eq("id", event.id)
        .single();

      if (refetchErr) { setError(refetchErr.message); setSaving(false); return; }
      onSaved(updated as Event);
    }

    setSaving(false);
  };

  // ── Recurrence change (replace entire series) ─────────────────────────────

  const applyRecurrenceChange = async (row: EventFormRow) => {
    setSaving(true);
    setError(null);

    const adminId = await getAdminId();

    // Delete all future occurrences of the old series.
    if (event.recurrence) {
      const { error: delErr } = await supabase
        .from("events")
        .delete()
        .eq("recurrence->>id", event.recurrence.id)
        .gte("starts_at", event.starts_at);

      if (delErr) { setError(delErr.message); setSaving(false); return; }
    }

    const firstStart = new Date(row.starts_at);
    const firstFinish = row.finishes_at ? new Date(row.finishes_at) : null;

    const activeRule: RecurrenceRule = recurrenceEnabled
      ? recurrenceRule
      : { frequency: "none" };

    const occurrences = expandRecurrences(activeRule, firstStart, firstFinish);

    const newRecurrence: RecurrenceRule | null = occurrences.length > 1
      ? { ...activeRule, id: event.recurrence?.id ?? crypto.randomUUID() }
      : null;

    const newRows = occurrences.map(({ start, finish }) => ({
      title:          row.title,
      category:       row.category,
      description:    row.description,
      event_type:     row.event_type,
      location:       row.location,
      postcode:       row.postcode,
      starts_at:      start.toISOString(),
      finishes_at:    finish ? finish.toISOString() : null,
      contact_name:   row.contact_name,
      contact_email:  row.contact_email,
      url:            row.url,
      price:          row.price,
      booking_info:   row.booking_info,
      accessibility:  row.accessibility,
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
                <button
                  className="editrecur-open-btn"
                  type="button"
                  onClick={() => setRecurrenceOpen(true)}
                >
                  Change recurrence…
                </button>
              ) : (
                <>
                  <RecurrencePicker
                    enabled={recurrenceEnabled}
                    rule={recurrenceRule}
                    startsAt={liveStartsAt}
                    onToggle={(v) => { setRecurrenceEnabled(v); setRecurrenceChanged(true); }}
                    onRuleChange={(r) => { setRecurrenceRule(r); setRecurrenceChanged(true); }}
                  />
                  {recurrenceChanged && (
                    <p className="editrecur-warning">
                      ⚠ Changing recurrence will replace all future occurrences in this series.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </EventForm>
      </div>
    </div>
  );
}