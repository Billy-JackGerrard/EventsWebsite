import './style.css'

import { StrictMode, useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./supabaseClient";
import { deduplicateByRecurrence } from "./utils/recurrence";
import Calendar from "./components/Calendar.tsx";
import Login from "./components/Login.tsx";
import Navbar from "./components/Navbar.tsx";
import AddEvent from "./components/events/AddEvent.tsx";
import EditEvent from "./components/events/EditEvent.tsx";
import EventDetails from "./components/events/EventDetails.tsx";
import AdminQueue from "./components/AdminQueue.tsx";
import Contact from "./components/Contact.tsx";
import type { Event } from "./utils/types.ts";
import type { View } from "./utils/views.ts";

function App() {
  const [view, setView] = useState<View>("calendar");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [postEditReturn, setPostEditReturn] = useState<View>("calendar");
  const [addEventDate, setAddEventDate] = useState<string | undefined>(undefined);

  const fetchPendingCount = useCallback(async () => {
    const { data } = await supabase
      .from("events")
      .select("id, recurrence")
      .eq("approved", false);

    if (!data) return;
    setPendingCount(deduplicateByRecurrence(data).length);
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

  // Clear the prefill date whenever navigating away from add-event via the navbar
  const handleNavigate = (v: View) => {
    if (v !== "add-event") setAddEventDate(undefined);
    setView(v);
  };

  const handleViewEvent = (event: Event) => {
    setViewingEvent(event);
    setView("event-detail");
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

  const handleAddEventFromCalendar = (date: { day: number; month: number; year: number }) => {
    const mm = String(date.month + 1).padStart(2, "0");
    const dd = String(date.day).padStart(2, "0");
    setAddEventDate(`${date.year}-${mm}-${dd}`);
    setView("add-event");
  };

  return (
    <>
      <Navbar
        currentView={view}
        isLoggedIn={isLoggedIn}
        pendingCount={pendingCount}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
      <div style={{ paddingTop: "60px" }}>
        {view === "calendar" && (
          <Calendar
            isLoggedIn={isLoggedIn}
            onViewEvent={handleViewEvent}
            onEditEvent={ev => handleEditEvent(ev, "calendar")}
            onAddEvent={handleAddEventFromCalendar}
          />
        )}
        {view === "event-detail" && viewingEvent && (
          <div className="event-detail-page">
            <EventDetails
              event={viewingEvent}
              isLoggedIn={isLoggedIn}
              onClose={() => setView("calendar")}
              onEdit={ev => handleEditEvent(ev, "event-detail")}
            />
          </div>
        )}
        {view === "login"      && <Login onLogin={handleLogin} />}
        {view === "add-event"  && <AddEvent prefillDate={addEventDate} />}
        {view === "edit-event" && isLoggedIn && editingEvent && (
          <EditEvent
            event={editingEvent}
            onSaved={handleEditSaved}
            onCancel={handleEditCancel}
            defaultRecurringScope={postEditReturn === "admin-queue" ? "all-future" : undefined}
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