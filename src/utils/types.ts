import type { RecurrenceRule } from "./recurrence";

/** Core event shape — returned by all approved-event queries. */
export type Event = {
  id: string;
  title: string;
  category: Category;
  description?: string;
  event_type?: 'in_person' | 'online' | 'both';
  location?: string;
  postcode?: string;
  price?: string;
  booking_info?: string;
  starts_at: string;
  finishes_at?: string;
  created_at: string;
  contact_name?: string;
  contact_email?: string;
  url?: string;
  accessibility?: string[];
  age_rating?: AgeRating;
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



export const AGE_RATINGS = [
  "Toddlers",
  "Children",
  "Family",
  "PG",
  "12+",
  "15+",
  "18+",
] as const;

export type AgeRating = typeof AGE_RATINGS[number];

export const CATEGORIES = [
  "Kids Activities",
  "Performance & Film",
  "Sports & Fitness",
  "Social & Games",
  "Arts & Crafts",
  "Tours & Exhibitions",
  "Talks & Workshops",
  "Party",
  "Religion",
  "Other",
] as const;

export type Category = typeof CATEGORIES[number];

export const CATEGORY_COLOURS: Record<Category, string> = {
  "Kids Activities":     "#f97316",
  "Performance & Film":  "#a855f7",
  "Sports & Fitness":    "#22c55e",
  "Social & Games":      "#3b82f6",
  "Arts & Crafts":       "#ec4899",
  "Tours & Exhibitions": "#14b8a6",
  "Talks & Workshops":   "#f59e0b",
  "Party":               "#f43f5e",
  "Religion":            "#64748b",
  "Other":               "#94a3b8",
};