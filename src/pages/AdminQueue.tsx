import { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { formatDateTimeRange } from "../utils/dates";
import { deduplicateByRecurrence } from "../utils/recurrence";
import type { AdminEvent } from "../utils/types";
import type { Event } from "../utils/types";
import EventDetails from "../components/events/EventDetails";
import { scrollToTopInstant } from "../components/SmoothScroll";
import "./AdminQueue.css";

type Props = {
  onPendingCountChange: (count: number) => void;
  onEditEvent: (event: Event) => void;
};

/** Returns the column/value pair to target this event (or its whole series) in a Supabase query. */
function eventFilter(ev: AdminEvent): [string, string | number] {
  const rid = ev.recurrence?.id;
  return rid ? ["recurrence->>id", rid] : ["id", ev.id];
}

/** Removes this event (or its whole series) from a local list. */
function withoutEvent(list: AdminEvent[], ev: AdminEvent): AdminEvent[] {
  const rid = ev.recurrence?.id;
  return rid
    ? list.filter(e => e.recurrence?.id !== rid)
    : list.filter(e => e.id !== ev.id);
}

export default function AdminQueue({ onPendingCountChange, onEditEvent }: Props) {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<number | null>(null);
  const [confirmReject, setConfirmReject] = useState<number | null>(null);
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
    const [col, val] = eventFilter(ev);

    const { error } = await supabase.from("events").update({ approved: true, admin_id: user?.id }).eq(col, val);
    if (error) { setError(error.message); setActingOn(null); return; }

    setEvents(prev => {
      const updated = withoutEvent(prev, ev);
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

    const [col, val] = eventFilter(ev);

    const { error } = await supabase.from("events").delete().eq(col, val);
    if (error) { setError(error.message); setActingOn(null); return; }

    setEvents(prev => {
      const updated = withoutEvent(prev, ev);
      onPendingCountChange(deduplicateByRecurrence(updated).length);
      return updated;
    });
    if (detailEvent && withoutEvent([detailEvent], ev).length === 0) setDetailEvent(null);
    setActingOn(null);
  };

  const handleCardClick = (ev: AdminEvent) => {
    if (detailEvent?.id === ev.id) {
      setDetailEvent(null);
    } else {
      setDetailEvent(ev);
      setConfirmReject(null);
      scrollToTopInstant();
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
        {actingOn === detailEvent.id ? (
          <span className="btn-loading">
            <span className="btn-spinner" aria-hidden="true" />
            Approving…
          </span>
        ) : "✓ Approve"}
      </button>

      {confirmReject === detailEvent.id ? (
        <>
          <button
            className="queue-btn queue-btn--reject"
            onClick={() => reject(detailEvent)}
            disabled={!!actingOn}
          >
            {actingOn === detailEvent.id ? (
              <span className="btn-loading">
                <span className="btn-spinner" aria-hidden="true" />
                Rejecting…
              </span>
            ) : "Confirm Reject"}
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

  const displayEvents = useMemo(() => deduplicateByRecurrence(events), [events]);

  return (
    <div className="queue-page">
      <div className="queue-layout">
        <div className="queue-container">
          <h2 className="queue-title">Pending Events</h2>

          {error && <div className="form-error" role="alert">{error}</div>}

          {loading ? (
            <div className="queue-list">
              {[1, 2, 3].map(i => (
                <div key={i} className="queue-card" style={{ cursor: "default" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.6rem", gap: "1rem" }}>
                    <div className="skeleton skeleton-lg" style={{ width: "55%" }} />
                    <div className="skeleton skeleton-lg" style={{ width: "30%" }} />
                  </div>
                  <div className="skeleton skeleton-md skeleton-mb" style={{ width: "40%" }} />
                  <div className="skeleton skeleton-md" style={{ width: "80%" }} />
                </div>
              ))}
            </div>
          ) : displayEvents.length === 0 ? (
            <div className="queue-empty">No pending events — you're all caught up!</div>
          ) : (
            <div className="queue-list">
              {displayEvents.map(ev => {
                const isSelected = detailEvent?.id === ev.id;
                const rid = ev.recurrence?.id;
                const seriesCount = rid
                  ? events.filter(e => e.recurrence?.id === rid).length
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

                    {ev.description && (
                      <div className="queue-event-description">{ev.description}</div>
                    )}

                    {seriesCount && (
                      <div className="queue-event-recurrence-badge">
                        ↻ Recurring series
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
              onEdit={onEditEvent}
              actions={detailActions}
              showAddToCalendar={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}