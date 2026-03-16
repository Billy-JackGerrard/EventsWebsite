import { useState } from "react";
import "./Contact.css";

type ContactType = "general" | "bug" | "suggestion";

const CONTACT_EMAIL = "billyjackgerrard@hotmail.com";

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
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSend = () => {
    if (!message.trim()) {
      setError("Please enter a message before sending.");
      return;
    }

    setError(null);

    const subject = encodeURIComponent(
      `[Edinburgh BSL Community Website] ${TYPE_LABELS[type]}${name ? ` — ${name}` : ""}`
    );
    const body = encodeURIComponent(
      `Type: ${TYPE_LABELS[type]}\n` +
      (name ? `From: ${name}\n` : "") +
      `\n${message}`
    );

    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
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
            <div className="contact-success-icon">✉</div>
            <h2 className="contact-title">Thanks!</h2>
            <p className="contact-success-msg">
              Your email application should have opened with your message pre-filled.
              If it didn't, you can email us directly at{" "}
              <a className="contact-email-link" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>.
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

        <p className="contact-note">
          Clicking the button below will open your email application with your message pre-filled.
        </p>

        <button
          className="btn-primary contact-btn--primary"
          onClick={handleSend}
          disabled={!message.trim()}
        >
          Open Mail App →
        </button>
      </div>
    </div>
  );
}