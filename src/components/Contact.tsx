import { useState } from "react";
import { supabase } from "../supabaseClient";
import "./Contact.css";

type ContactType = "general" | "bug" | "suggestion";

const TYPE_LABELS: Record<ContactType, string> = {
  general: "General Enquiry",
  bug: "Bug Report",
  suggestion: "Suggestion",
};

const TYPE_PLACEHOLDERS: Record<ContactType, string> = {
  general: "How can we help you?",
  bug: "What happened? What did you expect to happen? Any steps to reproduce…",
  suggestion: "What would you like to see on the site?",
};

export default function Contact() {
  const [type, setType] = useState<ContactType>("general");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      setError("Please enter a message before sending.");
      return;
    }

    setError(null);
    setLoading(true);

    const { error: dbError } = await supabase
      .from("contact_messages")
      .insert({ type, name: name.trim() || null, message: message.trim() });

    setLoading(false);

    if (dbError) {
      setError("Something went wrong sending your message. Please try again.");
      return;
    }

    setSubmitted(true);
  };

  const reset = () => {
    setType("general");
    setName("");
    setMessage("");
    setError(null);
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="contact-page">
        <div className="page-card contact-card">
          <div className="contact-success">
            <svg className="contact-success-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
            <h2 className="contact-title">Message sent</h2>
            <p className="contact-success-msg">
              Thanks for getting in touch — we'll take a look and get back to you if needed.
            </p>
            <button className="btn-primary contact-btn--primary" onClick={reset}>
              Send Another Message
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="contact-page">
      <div className="page-card contact-card">
        <h2 className="contact-title">Get in Touch</h2>
        <p className="contact-subtitle">
          Questions, bug reports, or ideas — we'd love to hear from you.
        </p>

        {error && <div className="form-error">{error}</div>}

        {/* Type selector */}
        <div className="form-field">
          <label className="form-label">I'm sending a…</label>
          <div className="contact-type-tabs">
            {(["general", "bug", "suggestion"] as ContactType[]).map(t => (
              <button
                key={t}
                className={`contact-type-tab ${type === t ? "contact-type-tab--active" : ""}`}
                onClick={() => setType(t)}
              >
                {t === "general" && "✉ "}
                {t === "bug" && "🐛 "}
                {t === "suggestion" && "💡 "}
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="form-field">
          <label className="form-label">
            Your Name <span className="contact-optional">(optional)</span>
          </label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. Jane Smith"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        {/* Message */}
        <div className="form-field">
          <label className="form-label">Message *</label>
          <textarea
            className="form-input contact-textarea"
            placeholder={TYPE_PLACEHOLDERS[type]}
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
        </div>

        <button
          className="btn-primary contact-btn--primary"
          onClick={handleSend}
          disabled={!message.trim() || loading}
        >
          {loading ? "Sending…" : "Send Message →"}
        </button>
      </div>
    </div>
  );
}
