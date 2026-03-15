import type { Event } from "../utils/types";
import { formatDateTimeRange } from "../utils/dates";
import "./EventDetails.css";

type Props = {
  event: Event;
  onClose: () => void;
};

export default function EventDetailCard({ event, onClose }: Props) {
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
    </div>
  );
}