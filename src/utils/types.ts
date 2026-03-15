export type Event = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  price?: string;
  booking_info?: string;
  starts_at: string;
  finishes_at?: string;
  admin_id?: string;
  approved: boolean;
  created_at: string;
  contact_name?: string;
  contact_email?: string;
  url?: string;
  whatsapp_url?: string;
  recurrence_id?: string;
};