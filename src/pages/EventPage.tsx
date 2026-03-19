import type { Event } from "../utils/types";
import EventDetailCard from "../components/events/EventDetails";
import "./EventPage.css";

type Props = {
  event: Event;
  isLoggedIn: boolean;
  onBack: () => void;
  onEdit: (event: Event) => void;
  onDelete?: (event: Event) => void;
  onDuplicate?: (event: Event) => void;
};

export default function EventPage({ event, isLoggedIn, onBack, onEdit, onDelete, onDuplicate }: Props) {
  return (
    <div className="eventpage-page">
      <div className="eventpage-card">
        <EventDetailCard
          event={event}
          isLoggedIn={isLoggedIn}
          onClose={onBack}
          onEdit={onEdit}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
        />
      </div>
    </div>
  );
}
