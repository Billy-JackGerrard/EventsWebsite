import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { formatDateTimeRange } from "../utils/dates";
import type { AdminEvent } from "../utils/types";
import type { Event } from "../utils/types";
import EventDetails from "./events/EventDetails";
import "./AdminQueue.css";

type ApproveScope = "single" | "all-series";

export default function AdminQueue() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState<string | null>(null);
  const [detailEvent, setDetailEvent] = useState<AdminEvent | null>(null);

  // Recurrence scope prompt state
  const [awaitingApproveScope, setAwaitingApproveScope] = useState(false);

  const fetchPending = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("approved", false)
      .order("starts_at", { ascending: true });

    if (error) setError(error.message);
    else setEvents(data || []);

    setLoading(false);
  };

  useEffect(() => {
    fetchPending();
  }, []);

  // ── Approve ─────────────────────────────────────────────────────────────────

  const handleApproveClick = () => {
    if (!detailEvent) return;
    if (detailEvent.recurrence_id) {
      setAwaitingApproveScope(true);
    } else {
      approveEvent(detailEvent.id, "single");
    }
  };

  const approveEvent = async (id: string, scope: ApproveScope) => {
    setError(null);
    setActingOn(id);
    setAwaitingApproveScope(false);

    const { data: { user } } = await supabase.auth.getUser();

    if (scope === "all-series" && detailEvent?.recurrence_id) {
      // Approve every unapproved occurrence in the recurrence group
      const { error } = await supabase
        .from("events")
        .update({ approved: true, admin_id: user?.id })
        .eq("recurrence_id", detailEvent.recurrence_id)
        .eq("approved", false);

      if (error) { setError(error.message); setActingOn(null); return; }

      // Remove all occurrences from the queue display
      setEvents(prev => prev.filter(e => e.recurrence_id !== detailEvent.recurrence_id));
    } else {
      const { error } = await supabase
        .from("events")
        .update({ approved: true, admin_id: user?.id })
        .eq("id", id);

      if (error) { setError(error.message); setActingOn(null); return; }
      setEvents(prev => prev.filter(e => e.id !== id));
    }

    setDetailEvent(null);
    setActingOn(null);
  };

  // ── Reject ──────────────────────────────────────────────────────────────────

  const reject = async (id: string) => {
    setError(null);
    setActingOn(id);
    setConfirmReject(null);

    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", id);

    if (error) { setError(error.message); setActingOn(null); return; }

    setEvents(prev => prev.filter(e => e.id !== id));
    if (detailEvent?.id === id) setDetailEvent(null);
    setActingOn(null);
  };

  const handleCardClick = (ev: AdminEvent) => {
    if (detailEvent?.id === ev.id) {
      setDetailEvent(null);
      setAwaitingApproveScope(false);
    } else {
      setDetailEvent(ev);
      setConfirmReject(null);
      setAwaitingApproveScope(false);
    }
  };

  // ── Approve scope prompt ─────────────────────────────────────────────────────

  const ApproveScopePrompt = () => {
    if (!detailEvent) return null;
    const seriesCount = events.filter(e => e.recurrence_id === detailEvent.recurrence_id).length;
    return (
      <div className="queue-scope-prompt">
        <div className="queue-scope-question">
          This event is part of a recurring series ({seriesCount} pending occurrence{seriesCount !== 1 ? "s" : ""}). Approve which?
        </div>
        <div className="queue-scope-actions">
          <button
            className="queue-btn queue-btn--approve"
            onClick={() => approveEvent(detailEvent.id, "single")}
            disabled={!!actingOn}
          >
            {actingOn ? "Approving…" : "Just this one"}
          </button>
          <button
            className="queue-btn queue-btn--approve-all"
            onClick={() => approveEvent(detailEvent.id, "all-series")}
            disabled={!!actingOn}
          >
            {actingOn ? "Approving…" : `All ${seriesCount} in series`}
          </button>
        </div>
        <button
          className="queue-scope-cancel"
          onClick={() => setAwaitingApproveScope(false)}
          disabled={!!actingOn}
        >
          ← Cancel
        </button>
      </div>
    );
  };

  // ── Detail panel actions ─────────────────────────────────────────────────────

  const detailActions = detailEvent ? (
    awaitingApproveScope ? (
      <ApproveScopePrompt />
    ) : (
      <div className="queue-detail-actions">
        <button
          className="queue-btn queue-btn--approve"
          onClick={handleApproveClick}
          disabled={!!actingOn}
        >
          {actingOn === detailEvent.id ? "Approving…" : "✓ Approve"}
        </button>

        {confirmReject === detailEvent.id ? (
          <>
            <button
              className="queue-btn queue-btn--reject"
              onClick={() => reject(detailEvent.id)}
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
    )
  ) : null;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="queue-page">
      <div className="queue-layout">
        <div className="queue-container">
          <h2 className="queue-title">Pending Events</h2>

          {error && <div className="queue-error">{error}</div>}

          {loading ? (
            <div className="queue-empty">Loading…</div>
          ) : events.length === 0 ? (
            <div className="queue-empty">No pending events — you're all caught up!</div>
          ) : (
            <div className="queue-list">
              {events.map(ev => {
                const isSelected = detailEvent?.id === ev.id;

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

                    {ev.recurrence_id && (
                      <div className="queue-event-recurrence-badge">↻ Recurring</div>
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
              onClose={() => { setDetailEvent(null); setAwaitingApproveScope(false); }}
              onEdit={() => {}}
              actions={detailActions}
            />
          </div>
        )}
      </div>
    </div>
  );
}