import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { formatDateTimeRange } from "../utils/dates";
import type { AdminEvent } from "../utils/types";
import type { Event } from "../utils/types";
import EventDetails from "./events/EventDetails";
import "./AdminQueue.css";

type Props = {
  onPendingCountChange: (count: number) => void;
};

/**
 * Deduplicate a list of pending events by recurrence_id.
 * For a recurring series, only the earliest occurrence is shown in the queue
 * as the representative — approving/rejecting it applies to the whole series.
 */
function deduplicateByRecurrence(events: AdminEvent[]): AdminEvent[] {
  const seen = new Set<string>();
  return events.filter(ev => {
    if (!ev.recurrence_id) return true;
    if (seen.has(ev.recurrence_id)) return false;
    seen.add(ev.recurrence_id);
    return true;
  });
}

export default function AdminQueue({ onPendingCountChange }: Props) {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState<string | null>(null);
  const [detailEvent, setDetailEvent] = useState<AdminEvent | null>(null);

  const fetchPending = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("approved", false)
      .order("starts_at", { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      const pending = data || [];
      setEvents(pending);
      // Badge count reflects unique items in the queue (deduplicated series)
      onPendingCountChange(deduplicateByRecurrence(pending).length);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchPending();
  }, []);

  // ── Approve ──────────────────────────────────────────────────────────────────

  const approve = async (ev: AdminEvent) => {
    setError(null);
    setActingOn(ev.id);

    const { data: { user } } = await supabase.auth.getUser();

    const query = ev.recurrence_id
      // Approve every occurrence in the series at once
      ? supabase.from("events").update({ approved: true, admin_id: user?.id }).eq("recurrence_id", ev.recurrence_id)
      : supabase.from("events").update({ approved: true, admin_id: user?.id }).eq("id", ev.id);

    const { error } = await query;
    if (error) { setError(error.message); setActingOn(null); return; }

    setEvents(prev => {
      const updated = ev.recurrence_id
        ? prev.filter(e => e.recurrence_id !== ev.recurrence_id)
        : prev.filter(e => e.id !== ev.id);
      onPendingCountChange(deduplicateByRecurrence(updated).length);
      return updated;
    });
    setDetailEvent(null);
    setActingOn(null);
  };

  // ── Reject ───────────────────────────────────────────────────────────────────

  const reject = async (ev: AdminEvent) => {
    setError(null);
    setActingOn(ev.id);
    setConfirmReject(null);

    const query = ev.recurrence_id
      // Delete every occurrence in the series
      ? supabase.from("events").delete().eq("recurrence_id", ev.recurrence_id)
      : supabase.from("events").delete().eq("id", ev.id);

    const { error } = await query;
    if (error) { setError(error.message); setActingOn(null); return; }

    setEvents(prev => {
      const updated = ev.recurrence_id
        ? prev.filter(e => e.recurrence_id !== ev.recurrence_id)
        : prev.filter(e => e.id !== ev.id);
      onPendingCountChange(deduplicateByRecurrence(updated).length);
      return updated;
    });
    if (detailEvent?.id === ev.id) setDetailEvent(null);
    setActingOn(null);
  };

  const handleCardClick = (ev: AdminEvent) => {
    if (detailEvent?.id === ev.id) {
      setDetailEvent(null);
    } else {
      setDetailEvent(ev);
      setConfirmReject(null);
    }
  };

  // ── Detail panel actions ──────────────────────────────────────────────────────

  const detailActions = detailEvent ? (
    <div className="queue-detail-actions">
      <button
        className="queue-btn queue-btn--approve"
        onClick={() => approve(detailEvent)}
        disabled={!!actingOn}
      >
        {actingOn === detailEvent.id ? "Approving…" : "✓ Approve"}
      </button>

      {confirmReject === detailEvent.id ? (
        <>
          <button
            className="queue-btn queue-btn--reject"
            onClick={() => reject(detailEvent)}
            disabled={!!actingOn}
          >
            {actingOn === detailEvent.id ? "Rejecting…" : "Confirm Reject"}
          </button>
          <button
            className="queue-btn queue-btn--cancel"
            onClick={() => setConfirmReject(null)}
            disabled={!!actingOn}
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          className="queue-btn queue-btn--reject"
          onClick={() => setConfirmReject(detailEvent.id)}
          disabled={!!actingOn}
        >
          ✕ Reject
        </button>
      )}
    </div>
  ) : null;

  // ── Render ────────────────────────────────────────────────────────────────────

  const displayEvents = deduplicateByRecurrence(events);

  return (
    <div className="queue-page">
      <div className="queue-layout">
        <div className="queue-container">
          <h2 className="queue-title">Pending Events</h2>

          {error && <div className="queue-error">{error}</div>}

          {loading ? (
            <div className="queue-empty">Loading…</div>
          ) : displayEvents.length === 0 ? (
            <div className="queue-empty">No pending events — you're all caught up!</div>
          ) : (
            <div className="queue-list">
              {displayEvents.map(ev => {
                const isSelected = detailEvent?.id === ev.id;
                const seriesCount = ev.recurrence_id
                  ? events.filter(e => e.recurrence_id === ev.recurrence_id).length
                  : null;

                return (
                  <div
                    key={ev.id}
                    className={`queue-card ${isSelected ? "queue-card--selected" : ""}`}
                    onClick={() => handleCardClick(ev)}
                  >
                    <div className="queue-card-header">
                      <div className="queue-event-title">{ev.title}</div>
                      <div className="queue-event-date">
                        {formatDateTimeRange(ev.starts_at, ev.finishes_at)}
                      </div>
                    </div>

                    {ev.location && (
                      <div className="queue-event-meta">📍 {ev.location}</div>
                    )}

                    {seriesCount && (
                      <div className="queue-event-recurrence-badge">
                        ↻ Recurring series · {seriesCount} occurrence{seriesCount !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {detailEvent && (
          <div className="queue-detail-panel">
            <EventDetails
              event={detailEvent as Event}
              isLoggedIn={true}
              onClose={() => setDetailEvent(null)}
              onEdit={() => {}}
              actions={detailActions}
            />
          </div>
        )}
      </div>
    </div>
  );
}