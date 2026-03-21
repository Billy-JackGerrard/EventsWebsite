import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { deduplicateByRecurrence } from "../utils/recurrence";

/**
 * Manages authentication state, admin identity, and badge counts.
 *
 * Consolidates what was previously 6 separate useState + 2 useCallback + 1 useEffect
 * in main.tsx into a single reusable hook.
 */
export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminName, setAdminName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [messagesCount, setMessagesCount] = useState(0);

  const fetchMessagesCount = useCallback(async () => {
    const { count, error } = await supabase
      .from("contact_messages")
      .select("id", { count: "exact", head: true });
    if (!error) setMessagesCount(count ?? 0);
  }, []);

  const fetchPendingCount = useCallback(async () => {
    const { data, error } = await supabase
      .from("events")
      .select("id, recurrence")
      .eq("approved", false);

    if (error || !data) { setPendingCount(0); return; }
    setPendingCount(deduplicateByRecurrence(data).length);
  }, []);

  useEffect(() => {
    const applySession = (session: { user: { email?: string; user_metadata?: Record<string, unknown> } } | null) => {
      setIsLoggedIn(!!session);
      setUserEmail(session?.user?.email ?? null);
      setAdminName((session?.user?.user_metadata?.display_name as string) ?? null);
      if (session) {
        fetchPendingCount().catch(console.error);
        fetchMessagesCount().catch(console.error);
      } else {
        setPendingCount(0);
        setMessagesCount(0);
      }
    };

    supabase.auth.getSession()
      .then(({ data: { session } }) => applySession(session))
      .catch(console.error);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => subscription.unsubscribe();
  }, [fetchPendingCount, fetchMessagesCount]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
  }, []);

  return {
    isLoggedIn,
    adminName,
    userEmail,
    pendingCount,
    setPendingCount,
    messagesCount,
    setMessagesCount,
    fetchPendingCount,
    handleLogout,
  };
}
