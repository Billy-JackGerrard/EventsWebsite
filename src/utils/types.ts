import type { RecurrenceRule } from "./recurrence";

/** Core event shape — returned by all approved-event queries. */
export type Event = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  price?: string;
  booking_info?: string;
  starts_at: string;
  finishes_at?: string;
  created_at: string;
  contact_name?: string;
  contact_email?: string;
  url?: string;
  whatsapp_url?: string;
  /** Unified recurrence field. Present and non-null when this event is part
   *  of a recurring series; the `id` field within links all occurrences. */
  recurrence?: RecurrenceRule;
};

/**
 * Extended shape used in admin contexts (AdminQueue, EditEvent) where
 * `approved` and `admin_id` are present and meaningful.
 */
export type AdminEvent = Event & {
  approved: boolean;
  admin_id?: string;
};