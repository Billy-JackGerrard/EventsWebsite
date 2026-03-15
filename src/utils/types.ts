export type Event = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  starts_at: string;
  finishes_at?: string;
  admin_id?: string;
  approved: boolean;
  created_at: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  url?: string;
};