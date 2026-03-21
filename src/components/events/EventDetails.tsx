import { atcb_action } from "add-to-calendar-button";
import { motion } from "framer-motion";
import type { Event } from "../../utils/types";
import { CATEGORY_COLOURS, formatAddress } from "../../utils/types";
import { formatDateTimeRange, toLocalDateKey, formatTime } from "../../utils/dates";
import { humaniseRule } from "../../utils/recurrence";
import { useCopyToClipboard } from "../../hooks/useCopyToClipboard";
import { getVideoDisplayInfo } from "../../utils/videoUtils";
import { fadeSlideUp, scaleSpring } from "../../utils/motion";
import "./EventDetails.css";


type Props = {
  event: Event;
  isLoggedIn: boolean;
  onClose: () => void;
  onEdit: (event: Event) => void;
  onDelete?: (event: Event) => void;
  onDuplicate?: (event: Event) => void;
  actions?: React.ReactNode;
  showAddToCalendar?: boolean;
};

function ShareButton({ eventId }: { eventId: number }) {
  const { copied, copy } = useCopyToClipboard();
  const shareUrl = `${window.location.origin}/event/${eventId}`;
  return (
    <button className="event-detail-share-btn" onClick={() => copy(shareUrl)}>
      {copied ? "Copied ✓" : "Share event"}
    </button>
  );
}

function LinkButtons({ url }: { url: string }) {
  const { copied, copy } = useCopyToClipboard();
  return (
    <div className="event-detail-link-buttons">
      <a className="event-detail-link-btn" href={url} target="_blank" rel="noopener noreferrer">
        Visit Website ↗
      </a>
      <button className="event-detail-copy-btn" onClick={() => copy(url)}>
        {copied ? "Copied ✓" : "Copy Link"}
      </button>
    </div>
  );
}

export default function EventDetailCard({ event, isLoggedIn, onClose, onEdit, onDelete, onDuplicate, actions, showAddToCalendar = true }: Props) {
  const normUrl = event.url
    ? (event.url.startsWith("http") ? event.url : `https://${event.url}`)
    : null;

  const recurrenceSummary = event.recurrence
    ? humaniseRule(event.recurrence, new Date(event.starts_at))
    : null;

  const bookingIsViaLink = event.booking_info === "via_link";
  const bookingIsContact = event.booking_info === "by_contacting";

  // Contact section shows if there's a name, or an email that wasn't already shown in the booking row
  const hasContactSection =
    !!event.contact_name ||
    (!!event.contact_email && !bookingIsContact);

  return (
    <motion.div className="event-detail-card" variants={fadeSlideUp} initial="hidden" animate="show">
      <div className="event-detail-close-row">
        <motion.button className="event-detail-close" onClick={onClose} aria-label="Back" whileTap={scaleSpring.tap}><span className="event-detail-close-arrow">←</span> Back</motion.button>
        {isLoggedIn && (
          <div className="event-detail-admin-actions">
            <motion.button className="event-detail-edit-btn" onClick={() => onEdit(event)} aria-label="Edit event" whileTap={scaleSpring.tap}>
              ✎ Edit
            </motion.button>
            {onDelete && (
              <motion.button className="event-detail-delete-btn" onClick={() => onDelete(event)} aria-label="Delete event" whileTap={scaleSpring.tap}>
                ✕ Delete
              </motion.button>
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

      {/* Description moved up, right after the header */}
      {event.description ? (
        <div className="event-detail-description">{event.description}</div>
      ) : (
        <div className="event-detail-nodesc">No description provided.</div>
      )}

      {/* BSL video */}
      {event.video_url && (() => {
        const info = getVideoDisplayInfo(event.video_url);
        if (!info) return null;
        return (
          <div className="event-detail-video">
            {info.type !== 'file' ? (
              <iframe
                src={info.embedUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="BSL event description video"
              />
            ) : (
              <video src={info.src} controls preload="metadata" />
            )}
          </div>
        );
      })()}

      {(event.event_type === 'in_person' || event.event_type === 'both') && (() => {
        const locationName = event.location;
        const addressText = event.address ? formatAddress(event.address) : null;
        if (!locationName && !addressText && !event.latitude && !event.longitude) return null;
        const queryText = [locationName, addressText].filter(Boolean).join(" — ");
        const mapsUrl = event.latitude && event.longitude
          ? `https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryText)}`;
        return (
          <div className="event-detail-row">
            <span className="event-detail-icon">📍</span>
            <div className="event-detail-location">
              <a className="event-detail-link" href={mapsUrl} target="_blank" rel="noopener noreferrer">
                {locationName || "View on map"}
              </a>
              {addressText && <span className="event-detail-address">{addressText}</span>}
            </div>
          </div>
        );
      })()}

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

      {event.age_rating && (
        <div className="event-detail-row">
          <span className="event-detail-icon">🔞</span>
          <span className="event-detail-text">{event.age_rating}</span>
        </div>
      )}

      {event.price && (
        <div className="event-detail-row">
          <span className="event-detail-icon">🎟</span>
          <span className="event-detail-text">{event.price}</span>
        </div>
      )}

      {/* Smart booking row */}
      {event.booking_info && (
        <div className="event-detail-row event-detail-booking-row">
          <span className="event-detail-icon">📋</span>
          <div className="event-detail-booking-content">
            {bookingIsViaLink ? (
              <>
                <span className="event-detail-text">Book via link</span>
                {normUrl && <LinkButtons url={normUrl} />}
              </>
            ) : bookingIsContact ? (
              <>
                <span className="event-detail-text">Contact to book</span>
                {(event.contact_name || event.contact_email) && (
                  <div className="event-detail-booking-contact">
                    {event.contact_name && (
                      <span className="event-detail-contact-name">{event.contact_name}</span>
                    )}
                    {event.contact_email && (
                      <a className="event-detail-link-btn event-detail-email-btn" href={`mailto:${event.contact_email}`}>
                        ✉ Email
                      </a>
                    )}
                  </div>
                )}
              </>
            ) : (
              <span className="event-detail-text">
                {event.booking_info === "just_turn_up" ? "Just turn up" : event.booking_info}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Standalone URL row — only when booking isn't "via_link" */}
      {normUrl && !bookingIsViaLink && (
        <div className="event-detail-row">
          <span className="event-detail-icon">🔗</span>
          <LinkButtons url={normUrl} />
        </div>
      )}

      {/* Contact section — only shown when there's info not already surfaced above */}
      {hasContactSection && (
        <div className="event-detail-contact">
          <div className="event-detail-contact-heading">Contact</div>

          {event.contact_name && (
            <div className="event-detail-row">
              <span className="event-detail-icon">👤</span>
              <span className="event-detail-text">{event.contact_name}</span>
            </div>
          )}

          {event.contact_email && !bookingIsContact && (
            <div className="event-detail-row">
              <span className="event-detail-icon">✉</span>
              <a className="event-detail-link" href={`mailto:${event.contact_email}`}>
                {event.contact_email}
              </a>
            </div>
          )}
        </div>
      )}

      <div className="event-detail-cal-row">
        <ShareButton eventId={event.id} />
        {onDuplicate && (
          <button className="event-detail-duplicate-btn" onClick={() => onDuplicate(event)}>
            ⧉ Duplicate Event
          </button>
        )}
      </div>

      {showAddToCalendar && (
        <div className="event-detail-cal-row">
          <button
            className="event-detail-cal-btn"
            onClick={(e) => {
              const endIso = event.finishes_at
                ?? new Date(new Date(event.starts_at).getTime() + 60 * 60 * 1000).toISOString();
              return atcb_action({
              name: event.title,
              startDate: toLocalDateKey(event.starts_at),
              startTime: formatTime(event.starts_at),
              endDate: toLocalDateKey(endIso),
              endTime: formatTime(endIso),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              location: [event.location, event.address && formatAddress(event.address)].filter(Boolean).join(" — ") || undefined,
              description: event.description ?? undefined,
              options: ["Apple", "Google", "iCal", "Microsoft365", "Outlook.com", "Yahoo"],
              listStyle: "modal",
              hideBranding: true,
            }, e.currentTarget); }}
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
    </motion.div>
  );
}
