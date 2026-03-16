import type { Event } from "../../utils/types";
import { formatDateTimeRange } from "../../utils/dates";
import { humaniseRule } from "../../utils/recurrence";
import "./EventDetails.css";

type Props = {
  event: Event;
  isLoggedIn: boolean;
  onClose: () => void;
  onEdit: (event: Event) => void;
  /** Optional slot rendered below the contact section (e.g. admin actions) */
  actions?: React.ReactNode;
};

export default function EventDetailCard({ event, isLoggedIn, onClose, onEdit, actions }: Props) {
  const hasContact =
    event.contact_name || event.contact_email ||
    event.url || event.whatsapp_url;

  const normUrl = event.url
    ? (event.url.startsWith("http") ? event.url : `https://${event.url}`)
    : null;

  const displayUrl = normUrl ? (() => {
    try {
      const u = new URL(normUrl);
      const path = u.pathname.length > 1 ? u.pathname.slice(0, 18) + (u.pathname.length > 18 ? "…" : "") : "";
      return u.hostname + path;
    } catch {
      return normUrl;
    }
  })() : null;

  const normWhatsapp = event.whatsapp_url
    ? (event.whatsapp_url.startsWith("http") ? event.whatsapp_url : `https://${event.whatsapp_url}`)
    : null;

  // Derive the human-readable recurrence summary if the rule is stored on the event.
  const recurrenceSummary = event.recurrence_id && event.recurrence_rule
    ? humaniseRule(event.recurrence_rule, new Date(event.starts_at))
    : null;

  return (
    <div className="event-detail-card">
      <div className="event-detail-close-row">
        <button className="event-detail-close" onClick={onClose} aria-label="Close">✕</button>
        {isLoggedIn && (
          <button
            className="event-detail-edit-btn"
            onClick={() => onEdit(event)}
            aria-label="Edit event"
          >
            ✎ Edit
          </button>
        )}
      </div>

      <div className="event-detail-header">
        <h3 className="event-detail-title">{event.title}</h3>
        <div className="event-detail-datetime">
          {formatDateTimeRange(event.starts_at, event.finishes_at)}
        </div>
        {recurrenceSummary && (
          <div className="event-detail-recurrence">
            <span className="event-detail-recurrence-icon">↻</span>
            {recurrenceSummary}
          </div>
        )}
      </div>

      {event.location && (
        <div className="event-detail-row">
          <span className="event-detail-icon">📍</span>
          <span className="event-detail-text">{event.location}</span>
        </div>
      )}

      {event.price && (
        <div className="event-detail-row">
          <span className="event-detail-icon">🎟</span>
          <span className="event-detail-text">{event.price}</span>
        </div>
      )}

      {event.booking_info && (
        <div className="event-detail-row">
          <span className="event-detail-icon">📋</span>
          <span className="event-detail-text">{event.booking_info}</span>
        </div>
      )}

      {event.description ? (
        <div className="event-detail-description">{event.description}</div>
      ) : (
        <div className="event-detail-nodesc">No description provided.</div>
      )}

      {hasContact && (
        <div className="event-detail-contact">
          <div className="event-detail-contact-heading">Contact</div>

          {event.contact_name && (
            <div className="event-detail-row">
              <span className="event-detail-icon">👤</span>
              <span className="event-detail-text">{event.contact_name}</span>
            </div>
          )}

          {event.contact_email && (
            <div className="event-detail-row">
              <span className="event-detail-icon">✉</span>
              <a className="event-detail-link" href={`mailto:${event.contact_email}`}>
                {event.contact_email}
              </a>
            </div>
          )}

          {normUrl && (
            <div className="event-detail-row">
              <span className="event-detail-icon">🔗</span>
              <a className="event-detail-link" href={normUrl} target="_blank" rel="noopener noreferrer">
                {displayUrl}
              </a>
            </div>
          )}

          {normWhatsapp && (
            <div className="event-detail-row">
              <span className="event-detail-icon">💬</span>
              <a className="event-detail-link" href={normWhatsapp} target="_blank" rel="noopener noreferrer">
                Join WhatsApp group
              </a>
            </div>
          )}
        </div>
      )}

      {actions && (
        <div className="event-detail-actions">
          {actions}
        </div>
      )}
    </div>
  );
}