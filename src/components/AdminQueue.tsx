import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import "./AdminQueue.css";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

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
    const { data: { user } } = await supabase.auth.getUser();
  
    const { error } = await supabase
      .from("events")
      .update({ approved: true, admin_id: user?.id })
      .eq("id", id);
  
    if (error) setError(error.message);
    else setEvents(prev => prev.filter(e => e.id !== id));
  };

  const reject = async (id: string) => {
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", id);

    if (error) setError(error.message);
    else setEvents(prev => prev.filter(e => e.id !== id));
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };

  const formatTime = (isoString: string) =>
    new Date(isoString).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const formatDateTimeRange = (start: string, finish?: string) => {
    const sameDay = finish && formatDate(start) === formatDate(finish);
    if (finish && !sameDay) {
      return `${formatDate(start)} ${formatTime(start)} – ${formatDate(finish)} ${formatTime(finish)}`;
    }
    const dateStr = formatDate(start);
    const timeStr = finish ? `${formatTime(start)} – ${formatTime(finish)}` : formatTime(start);
    return `${timeStr} · ${dateStr}`;
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
            {events.map(ev => (
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
                  <button className="queue-btn queue-btn--approve" onClick={() => approve(ev.id)}>
                    ✓ Approve
                  </button>
                  <button className="queue-btn queue-btn--reject" onClick={() => reject(ev.id)}>
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}