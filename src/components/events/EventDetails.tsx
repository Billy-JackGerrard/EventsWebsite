import { atcb_action } from "add-to-calendar-button";
import type { Event } from "../../utils/types";
import { CATEGORY_COLOURS } from "../../utils/types";
import { formatDateTimeRange } from "../../utils/dates";
import { humaniseRule } from "../../utils/recurrence";
import "./EventDetails.css";

function toLocalDate(iso: string) {
  const d = new Date(iso);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function toLocalTime(iso: string) {
  const d = new Date(iso);
  return [String(d.getHours()).padStart(2, "0"), String(d.getMinutes()).padStart(2, "0")].join(":");
}

type Props = {
  event: Event;
  isLoggedIn: boolean;
  onClose: () => void;
  onEdit: (event: Event) => void;
  onDelete?: (event: Event) => void;
  actions?: React.ReactNode;
  showAddToCalendar?: boolean;
};

export default function EventDetailCard({ event, isLoggedIn, onClose, onEdit, onDelete, actions, showAddToCalendar = true }: Props) {
  const hasContact =
    event.contact_name || event.contact_email || event.url;

  const normUrl = event.url
    ? (event.url.startsWith("http") ? event.url : `https://${event.url}`)
    : null;

  const displayUrl = normUrl ? (() => {
    try {
      const u = new URL(normUrl);
      const path = u.pathname.length > 1 ? u.pathname.slice(0, 18) + (u.pathname.length > 18 ? "…" : "") : "";
      return u.hostname + path;
    } catch { return normUrl; }
  })() : null;

  const recurrenceSummary = event.recurrence
    ? humaniseRule(event.recurrence, new Date(event.starts_at))
    : null;

  return (
    <div className="event-detail-card">
      <div className="event-detail-close-row">
        <button className="event-detail-close" onClick={onClose} aria-label="Close">✕</button>
        {isLoggedIn && (
          <div className="event-detail-admin-actions">
            <button className="event-detail-edit-btn" onClick={() => onEdit(event)} aria-label="Edit event">
              ✎ Edit
            </button>
            {onDelete && (
              <button className="event-detail-delete-btn" onClick={() => onDelete(event)} aria-label="Delete event">
                ✕ Delete
              </button>
            )}
          </div>
        )}
      </div>

      <div className="event-detail-header">
        <h3 className="event-detail-title">{event.title}</h3>
        <span
          className="event-detail-category"
          style={{ background: CATEGORY_COLOURS[event.category], borderColor: CATEGORY_COLOURS[event.category] }}
        >
          {event.category}
        </span>
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

      {(event.event_type === 'in_person' || event.event_type === 'both') && (
        <div className="event-detail-row">
          <span className="event-detail-icon">📍</span>
          <span className="event-detail-text">
            {[event.location, event.postcode].filter(Boolean).join(", ")}
          </span>
        </div>
      )}

      {(event.event_type === 'online' || event.event_type === 'both') && (
        <div className="event-detail-row">
          <span className="event-detail-icon">💻</span>
          <span className="event-detail-text">Online event</span>
        </div>
      )}

      {event.accessibility && event.accessibility.length > 0 && (
        <div className="event-detail-row">
          <span className="event-detail-icon">🤟</span>
          <span className="event-detail-text">{event.accessibility.join(" · ")}</span>
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
          <span className="event-detail-text">
            {event.booking_info === "via_link" ? "Book via a link" :
             event.booking_info === "by_contacting" ? "Book by contacting" :
             event.booking_info === "just_turn_up" ? "Just turn up" :
             event.booking_info}
          </span>
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
        </div>
      )}

      {showAddToCalendar && (
        <div className="event-detail-cal-row">
          <button
            className="event-detail-cal-btn"
            onClick={e => atcb_action({
              name: event.title,
              startDate: toLocalDate(event.starts_at),
              startTime: toLocalTime(event.starts_at),
              ...(event.finishes_at && {
                endDate: toLocalDate(event.finishes_at),
                endTime: toLocalTime(event.finishes_at),
              }),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              location: event.location ?? undefined,
              description: event.description ?? undefined,
              options: ["Apple", "Google", "iCal", "Microsoft365", "Outlook.com", "Yahoo"],
              listStyle: "modal",
              hideBranding: true,
            }, e.currentTarget)}
          >
            + Add to Calendar
          </button>
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