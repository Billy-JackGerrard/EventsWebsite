import { supabase } from "../supabaseClient";

/** Base query for approved events. Chain .order() and date filters on top. */
export const approvedEventsQuery = () =>
  supabase.from("events").select("*").eq("approved", true);
