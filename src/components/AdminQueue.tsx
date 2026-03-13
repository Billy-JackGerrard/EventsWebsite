import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { formatDateTimeRange } from "../utils/dates";
import "./AdminQueue.css";

type Event = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  starts_at: string;
  finishes_at?: string;
  admin_id?: string;
  approved: boolean;
  created_at: string;
};

export default function AdminQueue() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState<string | null>(null);

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

  const approve = async (id: string) => {
    setActingOn(id);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("events")
      .update({ approved: true, admin_id: user?.id })
      .eq("id", id);

    if (error) setError(error.message);
    else setEvents(prev => prev.filter(e => e.id !== id));
    setActingOn(null);
  };

  const reject = async (id: string) => {
    setActingOn(id);
    setConfirmReject(null);

    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", id);

    if (error) setError(error.message);
    else setEvents(prev => prev.filter(e => e.id !== id));
    setActingOn(null);
  };

  return (
    <div className="queue-page">
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
              const isActing = actingOn === ev.id;
              const isConfirming = confirmReject === ev.id;

              return (
                <div key={ev.id} className="queue-card">
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

                  <div className="queue-actions">
                    <button
                      className="queue-btn queue-btn--approve"
                      onClick={() => approve(ev.id)}
                      disabled={isActing}
                    >
                      {isActing ? "Approving…" : "✓ Approve"}
                    </button>

                    {isConfirming ? (
                      <>
                        <button
                          className="queue-btn queue-btn--reject"
                          onClick={() => reject(ev.id)}
                          disabled={isActing}
                        >
                          {isActing ? "Rejecting…" : "Confirm Reject"}
                        </button>
                        <button
                          className="queue-btn queue-btn--cancel"
                          onClick={() => setConfirmReject(null)}
                          disabled={isActing}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        className="queue-btn queue-btn--reject"
                        onClick={() => setConfirmReject(ev.id)}
                        disabled={isActing}
                      >
                        ✕ Reject
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}