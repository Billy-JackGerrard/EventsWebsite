import type { RecurrenceRule } from "./recurrence";

export type EventAddress = {
  road?: string;
  house_number?: string;
  suburb?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
};

export function formatAddress(addr: EventAddress): string {
  const street = [addr.house_number, addr.road].filter(Boolean).join(" ");
  return [street, addr.suburb, addr.city, addr.postcode].filter(Boolean).join(", ");
}

/** Core event shape — returned by all approved-event queries. */
export type Event = {
  id: number;
  title: string;
  category: Category;
  description?: string;
  event_type?: 'in_person' | 'online' | 'both';
  location?: string;
  address?: EventAddress;
  latitude?: number;
  longitude?: number;
  price?: string;
  booking_info?: BookingInfo;
  starts_at: string;
  finishes_at?: string;
  created_at: string;
  contact_name?: string;
  contact_email?: string;
  url?: string;
  video_url?: string;
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



export const BOOKING_INFO_OPTIONS = [
  "via_link",
  "by_contacting",
  "just_turn_up",
] as const;

export type BookingInfo = typeof BOOKING_INFO_OPTIONS[number];

export const BOOKING_INFO_LABELS: Record<BookingInfo, string> = {
  via_link:      "Via a link",
  by_contacting: "By contacting",
  just_turn_up:  "Just turn up",
};

export const AGE_RATINGS = [
  "Toddlers",
  "Children",
  "Family",
  "All",
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

export type ContactType = "general" | "enquiry" | "bug" | "suggestion";

/** Shape of rows in the contact_messages table. */
export type ContactMessage = {
  id: string;
  type: ContactType;
  name: string | null;
  email: string | null;
  title: string | null;
  message: string;
  created_at: string;
  is_admin: boolean;
  reply_to_id: string | null;
};

/** Shared type for site content sections. */
export type Section = {
  title: string;
  paragraphs: string[];
};

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

/** Returns true if a hex colour is perceptually light (better with dark text). */
export function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  // sRGB relative luminance (WCAG formula)
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.45;
}