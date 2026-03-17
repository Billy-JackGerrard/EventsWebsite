import './style.css'

import { StrictMode, useState, useEffect, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import ErrorBoundary from "./components/ErrorBoundary";
import { supabase } from "./supabaseClient";
import { deduplicateByRecurrence } from "./utils/recurrence";
import Calendar from "./pages/Calendar.tsx";
import Login from "./pages/Login.tsx";
import AdminQueue from "./pages/AdminQueue.tsx";
import AdminMessages from "./pages/AdminMessages.tsx";
import Contact from "./pages/Contact.tsx";
import AboutUs from "./pages/AboutUs.tsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.tsx";
import EventList from "./pages/EventList.tsx";
import Navbar from "./components/Navbar.tsx";
import PrivacyBanner from "./components/PrivacyBanner.tsx";
import AddEvent from "./components/events/AddEvent.tsx";
import EditEvent from "./components/events/EditEvent.tsx";
import DeleteEventConfirm from "./components/events/DeleteEventConfirm.tsx";
import type { Event } from "./utils/types.ts";
import type { View } from "./utils/views.ts";

function App() {
  const [view, setView] = useState<View>("calendar");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [postEditReturn, setPostEditReturn] = useState<View>("calendar");
  const [postDeleteReturn, setPostDeleteReturn] = useState<View>("calendar");
  const [addEventDate, setAddEventDate] = useState<string | undefined>(undefined);
  const [searchOpen, setSearchOpen] = useState(false);
  const [initialEventId, setInitialEventId] = useState<string | undefined>(() => {
    const match = window.location.pathname.match(/^\/event\/([^/]+)$/);
    return match ? match[1] : undefined;
  });
  const [initialEventDate, setInitialEventDate] = useState<Date | undefined>(undefined);
  const scrollToTodayRef = useRef<(() => void) | null>(null);
  const handleToggleSearch = useCallback(() => setSearchOpen(o => !o), []);
  const handleScrollToTodayReady = useCallback((fn: () => void) => { scrollToTodayRef.current = fn; }, []);

  useEffect(() => {
    if (!initialEventId) { setInitialEventDate(undefined); return; }
    void Promise.resolve(
      supabase
        .from("events")
        .select("starts_at")
        .eq("id", initialEventId)
        .single()
    ).then(({ data }) => { if (data) setInitialEventDate(new Date(data.starts_at)); })
     .catch(() => { /* event not found via URL — ignore */ });
  }, [initialEventId]);

  const handleEventExpand = useCallback((event: Event | null) => {
    window.history.pushState({}, "", event ? `/event/${event.id}` : "/");
  }, []);

  useEffect(() => {
    const handler = () => {
      const match = window.location.pathname.match(/^\/event\/([^/]+)$/);
      setInitialEventId(match ? match[1] : undefined);
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

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
    }).catch(console.error);

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
    if (view === "admin-messages" && !isLoggedIn) setView("login");
    if (view === "edit-event" && !isLoggedIn) setView("calendar");
    if (view === "admin-queue" && isLoggedIn) fetchPendingCount();
  }, [view, isLoggedIn, fetchPendingCount]);

  const handleLogin = () => setView("calendar");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setView("calendar");
  };

  const handleNavigate = (v: View) => {
    if (v !== "add-event") setAddEventDate(undefined);
    if (v !== "calendar") {
      setSearchOpen(false);
      if (window.location.pathname !== "/") window.history.pushState({}, "", "/");
      setInitialEventId(undefined);
      setInitialEventDate(undefined);
    }
    setView(v);
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

  const handleDeleteEvent = (event: Event, returnTo: View = "calendar") => {
    setDeletingEvent(event);
    setPostDeleteReturn(returnTo);
    setView("delete-event");
  };

  const handleDeleted = () => {
    setDeletingEvent(null);
    setView("calendar");
  };

  const handleDeleteCancel = () => {
    setView(postDeleteReturn);
  };

  const handleAddEventFromCalendar = (date: { day: number; month: number; year: number }) => {
    const mm = String(date.month + 1).padStart(2, "0");
    const dd = String(date.day).padStart(2, "0");
    setAddEventDate(`${date.year}-${mm}-${dd}`);
    setView("add-event");
  };

  return (
    <>
      <PrivacyBanner onNavigate={handleNavigate} />
      <Navbar
        currentView={view}
        isLoggedIn={isLoggedIn}
        pendingCount={pendingCount}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        showCalendarControls={view === "calendar"}
        onScrollToToday={() => scrollToTodayRef.current?.()}
        onToggleSearch={handleToggleSearch}
      />
      <div key={view} className="page-view" style={{ paddingTop: "60px" }}>
        {view === "calendar" && (
          <Calendar
            isLoggedIn={isLoggedIn}
            onEditEvent={ev => handleEditEvent(ev, "calendar")}
            onDeleteEvent={isLoggedIn ? ev => handleDeleteEvent(ev, "calendar") : undefined}
            onAddEvent={handleAddEventFromCalendar}
            searchOpen={searchOpen}
            onToggleSearch={handleToggleSearch}
            onScrollToTodayReady={handleScrollToTodayReady}
            initialEventId={initialEventId}
            initialEventDate={initialEventDate}
            onEventExpand={handleEventExpand}
          />
        )}
        {view === "list" && (
          <EventList
            isLoggedIn={isLoggedIn}
            onEditEvent={ev => handleEditEvent(ev, "list")}
            onDeleteEvent={isLoggedIn ? ev => handleDeleteEvent(ev, "list") : undefined}
          />
        )}
        {view === "login"      && <Login onLogin={handleLogin} />}
        {view === "add-event"  && <AddEvent prefillDate={addEventDate} />}
        {view === "delete-event" && isLoggedIn && deletingEvent && (
          <DeleteEventConfirm
            event={deletingEvent}
            onDeleted={handleDeleted}
            onCancel={handleDeleteCancel}
          />
        )}
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
        {view === "admin-messages" && isLoggedIn && <AdminMessages />}
        {view === "contact" && <Contact />}
        {view === "about" && <AboutUs />}
        {view === "privacy" && <PrivacyPolicy />}
      </div>
    </>
  );
}

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);