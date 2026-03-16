import './style.css'

import { StrictMode, useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./supabaseClient";
import Calendar from "./components/Calendar.tsx";
import Login from "./components/Login.tsx";
import Navbar from "./components/Navbar.tsx";
import AddEvent from "./components/events/AddEvent.tsx";
import EditEvent from "./components/events/EditEvent.tsx";
import AdminQueue from "./components/AdminQueue.tsx";
import Contact from "./components/Contact.tsx";
import type { Event } from "./utils/types.ts";
import type { View } from "./utils/views.ts";

function App() {
  const [view, setView] = useState<View>("calendar");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [postEditReturn, setPostEditReturn] = useState<View>("calendar");

  const fetchPendingCount = useCallback(async () => {
    // Fetch pending event ids + recurrence field so we can deduplicate by
    // recurrence.id client-side — matching the same logic AdminQueue uses.
    // A raw COUNT would overcount recurring series.
    const { data } = await supabase
      .from("events")
      .select("id, recurrence")
      .eq("approved", false);

    if (!data) return;

    const seen = new Set<string>();
    let count = 0;
    for (const ev of data) {
      const rid = ev.recurrence?.id;
      if (rid) {
        if (seen.has(rid)) continue;
        seen.add(rid);
      }
      count++;
    }
    setPendingCount(count);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      if (session) fetchPendingCount();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      if (session) fetchPendingCount();
      if (!session) {
        setView("calendar");
        setPendingCount(0);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchPendingCount]);

  useEffect(() => {
    if (view === "admin-queue" && !isLoggedIn) setView("login");
    if (view === "edit-event" && !isLoggedIn) setView("calendar");
    if (view === "admin-queue" && isLoggedIn) fetchPendingCount();
  }, [view, isLoggedIn, fetchPendingCount]);

  const handleLogin = () => setView("calendar");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setView("calendar");
  };

  const handleEditEvent = (event: Event, returnTo: View = "calendar") => {
    setEditingEvent(event);
    setPostEditReturn(returnTo);
    setView("edit-event");
  };

  const handleEditSaved = (updated: Event) => {
    setEditingEvent(updated);
    setView(postEditReturn);
  };

  const handleEditCancel = () => {
    setView(postEditReturn);
  };

  return (
    <>
      <Navbar
        currentView={view}
        isLoggedIn={isLoggedIn}
        pendingCount={pendingCount}
        onNavigate={setView}
        onLogout={handleLogout}
      />
      <div style={{ paddingTop: "60px" }}>
        {view === "calendar" && (
          <Calendar isLoggedIn={isLoggedIn} onEditEvent={ev => handleEditEvent(ev, "calendar")} />
        )}
        {view === "login"      && <Login onLogin={handleLogin} />}
        {view === "add-event"  && <AddEvent />}
        {view === "edit-event" && isLoggedIn && editingEvent && (
          <EditEvent
            event={editingEvent}
            onSaved={handleEditSaved}
            onCancel={handleEditCancel}
          />
        )}
        {view === "admin-queue" && isLoggedIn && (
          <AdminQueue
            onPendingCountChange={setPendingCount}
            onEditEvent={ev => handleEditEvent(ev, "admin-queue")}
          />
        )}
        {view === "contact" && <Contact />}
      </div>
    </>
  );
}

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);