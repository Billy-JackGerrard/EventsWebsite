import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";
import type { ContactType } from "../utils/types";
import { CONTACT_TYPES, CONTACT_TYPE_LABELS, CONTACT_TYPE_PLACEHOLDERS, CONTACT_TYPE_ICONS } from "../utils/contactConfig";
import { isValidEmail } from "../utils/validation";
import { scaleSpring } from "../utils/motion";
import "./Contact.css";

export default function Contact() {
  const [type, setType] = useState<ContactType>("general");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      setError("Please enter a message before sending.");
      return;
    }
    if (email.trim() && !isValidEmail(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setError(null);
    setLoading(true);

    const { error: dbError } = await supabase
      .from("contact_messages")
      .insert({ type, name: name.trim() || null, email: email.trim() || null, title: title.trim() || null, message: message.trim() });

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
    setEmail("");
    setTitle("");
    setMessage("");
    setError(null);
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="contact-page">
        <div className="page-card contact-card">
          <div className="contact-success">
            <motion.svg
              className="contact-success-icon"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              animate={{ scale: [0, 1.15, 1], opacity: [0, 1, 1] }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <circle cx="12" cy="12" r="9" />
              <polyline points="9 12 11 14 15 10" />
            </motion.svg>
            <h2 className="contact-title">Message sent</h2>
            <p className="contact-success-msg">
              Thanks for getting in touch — we'll take a look and get back to you if needed.
            </p>
            <motion.button className="btn-primary contact-btn--primary" onClick={reset} whileTap={scaleSpring.tap}>
              Send Another Message
            </motion.button>
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

        {error && <div className="form-error" role="alert">{error}</div>}

        {/* Type selector */}
        <div className="form-field">
          <label className="form-label">I'm sending a…</label>
          <div className="contact-type-tabs">
            {CONTACT_TYPES.map(t => (
              <button
                key={t}
                className={`contact-type-tab ${type === t ? "contact-type-tab--active" : ""}`}
                onClick={() => setType(t)}
              >
                {CONTACT_TYPE_ICONS[t]} {CONTACT_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="form-field">
          <label htmlFor="contact-name" className="form-label">
            Your Name <span className="contact-optional">(optional)</span>
          </label>
          <input
            id="contact-name"
            className="form-input"
            type="text"
            placeholder="e.g. Jane Smith"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        {/* Email */}
        <div className="form-field">
          <label htmlFor="contact-email" className="form-label">
            Your Email <span className="contact-optional">(optional)</span>
          </label>
          <input
            id="contact-email"
            className="form-input"
            type="email"
            placeholder="e.g. jane@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        {/* Title */}
        <div className="form-field">
          <label htmlFor="contact-title" className="form-label">
            Title <span className="contact-optional">(optional)</span>
          </label>
          <input
            id="contact-title"
            className="form-input"
            type="text"
            placeholder="e.g. Question about upcoming events"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        {/* Message */}
        <div className="form-field">
          <label htmlFor="contact-message" className="form-label">Message *</label>
          <textarea
            id="contact-message"
            className="form-input contact-textarea"
            placeholder={CONTACT_TYPE_PLACEHOLDERS[type]}
            maxLength={2000}
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
        </div>

        <button
          className="btn-primary contact-btn--primary"
          onClick={handleSend}
          disabled={!message.trim() || loading}
        >
          {loading ? (
            <span className="btn-loading">
              <span className="btn-spinner" aria-hidden="true" />
              Sending…
            </span>
          ) : "Send Message →"}
        </button>
      </div>
    </div>
  );
}
