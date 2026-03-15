import type { Event } from "../utils/types";
import { formatDateTimeRange } from "../utils/dates";
import "./EventDetails.css";

type Props = {
  event: Event;
  onClose: () => void;
};

export default function EventDetailCard({ event, onClose }: Props) {
  const hasContact =
    event.contact_name || event.contact_email ||
    event.contact_phone || event.url;

  const normUrl = event.url
    ? (event.url.startsWith("http") ? event.url : `https://${event.url}`)
    : null;

  // Shorten a URL to just the hostname + truncated path for display
  const displayUrl = normUrl ? (() => {
    try {
      const u = new URL(normUrl);
      const path = u.pathname.length > 1 ? u.pathname.slice(0, 18) + (u.pathname.length > 18 ? "…" : "") : "";
      return u.hostname + path;
    } catch {
      return normUrl;
    }
  })() : null;

  return (
    <div className="event-detail-card">
      <button className="event-detail-close" onClick={onClose} aria-label="Close">✕</button>

      <div className="event-detail-header">
        <h3 className="event-detail-title">{event.title}</h3>
        <div className="event-detail-datetime">
          {formatDateTimeRange(event.starts_at, event.finishes_at)}
        </div>
      </div>

      {event.location && (
        <div className="event-detail-row">
          <span className="event-detail-icon">📍</span>
          <span className="event-detail-text">{event.location}</span>
        </div>
      )}

      {event.description ? (
        <div className="event-detail-description">
          {event.description}
        </div>
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
              <a
                className="event-detail-link"
                href={`mailto:${event.contact_email}`}
              >
                {event.contact_email}
              </a>
            </div>
          )}

          {event.contact_phone && (
            <div className="event-detail-row">
              <span className="event-detail-icon">📞</span>
              <a
                className="event-detail-link"
                href={`tel:${event.contact_phone.replace(/\s/g, "")}`}
              >
                {event.contact_phone}
              </a>
            </div>
          )}

          {normUrl && (
            <div className="event-detail-row">
              <span className="event-detail-icon">🔗</span>
              <a
                className="event-detail-link"
                href={normUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {displayUrl}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}