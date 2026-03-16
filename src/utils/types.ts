import type { RecurrenceRule } from "./recurrence";

/** Core event shape — returned by all approved-event queries. */
export type Event = {
  id: string;
  title: string;
  category: Category;
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



export const CATEGORIES = [
  "Children & Families",
  "Theatre",
  "Sports",
  "Games",
  "Arts & Crafts",
  "Exhibition",
  "Tours",
  "Party",
  "Screening",
  "Religion",
  "Meet and Chat",
  "Other",
] as const;

export type Category = typeof CATEGORIES[number];

export const CATEGORY_COLOURS: Record<Category, string> = {
  "Children & Families": "#f97316",
  "Theatre":             "#a855f7",
  "Sports":              "#22c55e",
  "Games":               "#3b82f6",
  "Arts & Crafts":       "#ec4899",
  "Exhibition":          "#14b8a6",
  "Tours":               "#f59e0b",
  "Party":               "#f43f5e",
  "Screening":           "#6366f1",
  "Religion":            "#64748b",
  "Meet and Chat":       "#06b6d4",
  "Other":               "#94a3b8",
};