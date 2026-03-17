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
  reply_to_id: number | null;
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

export default function AdminMessages({ userEmail, onMessagesCountChange }: { userEmail: string | null; onMessagesCountChange?: (count: number) => void }) {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compose, setCompose] = useState("");
  const [composeName, setComposeName] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);

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

  useEffect(() => {
    if (!loading) onMessagesCountChange?.(messages.length);
  }, [messages, loading, onMessagesCountChange]);

  const handleSend = async () => {
    if (!compose.trim()) return;
    setSending(true);
    setError(null);

    const { data, error: dbError } = await supabase
      .from("contact_messages")
      .insert({ type: "general", name: composeName.trim() || null, email: userEmail, message: compose.trim(), is_admin: true, reply_to_id: null })
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

  const handleReply = async (parentId: number) => {
    if (!replyText.trim()) return;
    setReplySending(true);
    setError(null);

    const { data, error: dbError } = await supabase
      .from("contact_messages")
      .insert({ type: "general", name: composeName.trim() || null, email: userEmail, message: replyText.trim(), is_admin: true, reply_to_id: parentId })
      .select()
      .single();

    setReplySending(false);

    if (dbError) {
      setError("Failed to send reply. Please try again.");
      return;
    }

    setReplyText("");
    setReplyingToId(null);
    setMessages(prev => [data, ...prev]);
  };

  const handleEditStart = (msg: ContactMessage) => {
    setEditingId(msg.id);
    setEditText(msg.message);
    setConfirmDelete(null);
    setReplyingToId(null);
  };

  const handleEditSave = async (id: number) => {
    if (!editText.trim()) return;
    setSavingId(id);
    setError(null);

    const { error: dbError } = await supabase
      .from("contact_messages")
      .update({ message: editText.trim() })
      .eq("id", id);

    setSavingId(null);

    if (dbError) {
      setError("Failed to save edit.");
      return;
    }

    setMessages(prev => prev.map(m => m.id === id ? { ...m, message: editText.trim() } : m));
    setEditingId(null);
    setEditText("");
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

    setMessages(prev => prev.filter(m => m.id !== id && m.reply_to_id !== id));
  };

  const topLevel = messages.filter(m => m.reply_to_id == null);
  const repliesFor = (parentId: number) =>
    messages
      .filter(m => m.reply_to_id === parentId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const renderCard = (msg: ContactMessage, isReply = false) => (
    <div key={msg.id} className={`msgs-card${msg.is_admin ? " msgs-card--admin" : ""}${isReply ? " msgs-card--reply" : ""}`}>
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

      {editingId === msg.id ? (
        <div className="msgs-edit">
          <textarea
            className="form-input msgs-compose-textarea"
            value={editText}
            onChange={e => setEditText(e.target.value)}
            autoFocus
          />
          <div className="msgs-actions">
            <button
              className="msgs-action-btn"
              onClick={() => handleEditSave(msg.id)}
              disabled={!editText.trim() || savingId === msg.id}
            >
              {savingId === msg.id ? "Saving…" : "Save"}
            </button>
            <button
              className="msgs-action-btn"
              onClick={() => { setEditingId(null); setEditText(""); }}
              disabled={savingId === msg.id}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="msgs-body">{msg.message}</p>
      )}

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
          <>
            {!isReply && editingId !== msg.id && (
              <button
                className="msgs-action-btn"
                onClick={() => { setReplyingToId(replyingToId === msg.id ? null : msg.id); setReplyText(""); setEditingId(null); }}
                disabled={deletingId !== null || editingId !== null}
              >
                {replyingToId === msg.id ? "Cancel Reply" : "Reply"}
              </button>
            )}
            {msg.is_admin && msg.email === userEmail && editingId !== msg.id && (
              <button
                className="msgs-action-btn"
                onClick={() => handleEditStart(msg)}
                disabled={deletingId !== null || editingId !== null}
              >
                Edit
              </button>
            )}
            <button
              className="msgs-action-btn msgs-action-btn--danger"
              onClick={() => setConfirmDelete(msg.id)}
              disabled={deletingId !== null || editingId !== null}
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );

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
            {topLevel.map(msg => (
              <div key={msg.id} className="msgs-thread">
                {renderCard(msg, false)}

                {replyingToId === msg.id && (
                  <div className="msgs-reply-form">
                    <textarea
                      className="form-input msgs-compose-textarea"
                      placeholder="Write a reply…"
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      autoFocus
                    />
                    <div className="msgs-actions">
                      <button
                        className="msgs-send-btn"
                        onClick={() => handleReply(msg.id)}
                        disabled={!replyText.trim() || replySending}
                      >
                        {replySending ? "Sending…" : "Send Reply →"}
                      </button>
                    </div>
                  </div>
                )}

                {repliesFor(msg.id).length > 0 && (
                  <div className="msgs-replies">
                    {repliesFor(msg.id).map(reply => renderCard(reply, true))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
