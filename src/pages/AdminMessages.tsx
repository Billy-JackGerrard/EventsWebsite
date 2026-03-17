import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import "./AdminMessages.css";

type ContactType = "general" | "bug" | "suggestion";

type ContactMessage = {
  id: number;
  type: ContactType;
  name: string | null;
  email: string | null;
  message: string;
  created_at: string;
  is_admin: boolean;
};

const TYPE_LABELS: Record<ContactType, string> = {
  general: "General",
  bug: "Bug",
  suggestion: "Suggestion",
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminMessages({ userEmail }: { userEmail: string | null }) {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compose, setCompose] = useState("");
  const [composeName, setComposeName] = useState(userEmail ? userEmail.split("@")[0] : "");
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const fetchMessages = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleSend = async () => {
    if (!compose.trim()) return;
    setSending(true);
    setError(null);

    const { data, error: dbError } = await supabase
      .from("contact_messages")
      .insert({ type: "general", name: composeName.trim() || null, email: userEmail, message: compose.trim(), is_admin: true })
      .select()
      .single();

    setSending(false);

    if (dbError) {
      setError("Failed to send message. Please try again.");
      return;
    }

    setCompose("");
    setMessages(prev => [data, ...prev]);
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setConfirmDelete(null);
    setError(null);

    const { error: dbError } = await supabase
      .from("contact_messages")
      .delete()
      .eq("id", id);

    setDeletingId(null);

    if (dbError) {
      setError("Failed to delete message.");
      return;
    }

    setMessages(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="msgs-page">
      <div className="msgs-container">
        <h2 className="msgs-title">Messages</h2>

        {error && <div className="form-error">{error}</div>}

        {/* Compose */}
        <div className="msgs-compose">
          <input
            className="form-input"
            type="text"
            placeholder="Your name"
            value={composeName}
            onChange={e => setComposeName(e.target.value)}
          />
          <textarea
            className="form-input msgs-compose-textarea"
            placeholder="Write a message…"
            value={compose}
            onChange={e => setCompose(e.target.value)}
          />
          <button
            className="msgs-send-btn"
            onClick={handleSend}
            disabled={!compose.trim() || sending}
          >
            {sending ? "Sending…" : "Send →"}
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="msgs-list">
            {[1, 2, 3].map(i => (
              <div key={i} className="msgs-card">
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.6rem" }}>
                  <div className="skeleton" style={{ height: "1rem", width: "20%", borderRadius: "4px" }} />
                  <div className="skeleton" style={{ height: "1rem", width: "25%", borderRadius: "4px" }} />
                </div>
                <div className="skeleton" style={{ height: "0.85rem", width: "85%", borderRadius: "4px", marginBottom: "0.4rem" }} />
                <div className="skeleton" style={{ height: "0.85rem", width: "65%", borderRadius: "4px" }} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="msgs-empty">No messages yet.</div>
        ) : (
          <div className="msgs-list">
            {messages.map(msg => (
              <div key={msg.id} className={`msgs-card${msg.is_admin ? " msgs-card--admin" : ""}`}>
                <div className="msgs-card-header">
                  <div className="msgs-meta">
                    {msg.is_admin ? (
                      <span className="msgs-badge msgs-badge--admin">Admin</span>
                    ) : (
                      <span className={`msgs-badge msgs-badge--${msg.type}`}>
                        {TYPE_LABELS[msg.type]}
                      </span>
                    )}
                    <span className="msgs-sender">
                      {msg.name || "Anonymous"}
                      {msg.email && (
                        <span className="msgs-email"> — {msg.email}</span>
                      )}
                    </span>
                  </div>
                  <span className="msgs-timestamp">{formatTimestamp(msg.created_at)}</span>
                </div>

                <p className="msgs-body">{msg.message}</p>

                <div className="msgs-actions">
                  {confirmDelete === msg.id ? (
                    <>
                      <button
                        className="msgs-action-btn msgs-action-btn--danger"
                        onClick={() => handleDelete(msg.id)}
                        disabled={deletingId === msg.id}
                      >
                        {deletingId === msg.id ? "Deleting…" : "Confirm Delete"}
                      </button>
                      <button
                        className="msgs-action-btn"
                        onClick={() => setConfirmDelete(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      className="msgs-action-btn msgs-action-btn--danger"
                      onClick={() => setConfirmDelete(msg.id)}
                      disabled={deletingId !== null}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
