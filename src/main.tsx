import './style.css'

import { StrictMode, useState, useEffect, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import ErrorBoundary from "./components/ErrorBoundary";
import { supabase } from "./supabaseClient";
import { useAuth } from "./hooks/useAuth";
import Calendar from "./pages/Calendar.tsx";
import Login from "./pages/Login.tsx";
import AdminQueue from "./pages/AdminQueue.tsx";
import AdminMessages from "./pages/AdminMessages.tsx";
import AdminAboutUs from "./pages/AdminAboutUs.tsx";
import Contact from "./pages/Contact.tsx";
import AboutUs from "./pages/AboutUs.tsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.tsx";
import EventList from "./pages/EventList.tsx";
import EventPage from "./pages/EventPage.tsx";
import Navbar from "./components/Navbar.tsx";
import PrivacyBanner from "./components/PrivacyBanner.tsx";
import AddEvent from "./components/events/AddEvent.tsx";
import EditEvent from "./components/events/EditEvent.tsx";
import DeleteEventConfirm from "./components/events/DeleteEventConfirm.tsx";
import type { Event } from "./utils/types.ts";
import type { View } from "./utils/views.ts";

/** Public pages that get their own shareable URL path. */
const PAGE_PATHS: Partial<Record<View, string>> = {
  about: "/about",
  contact: "/contact",
  privacy: "/privacy",
};
const PATH_TO_VIEW = Object.fromEntries(
  Object.entries(PAGE_PATHS).map(([v, p]) => [p, v as View])
);

/** Fetch a single approved event by ID. Returns the event or null. */
async function fetchEventById(id: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .eq("approved", true)
    .single();

  if (error) {
    // PGRST116 = "no rows returned" — expected for invalid/deleted event IDs
    if (error.code !== "PGRST116") console.error("Failed to fetch event:", error.message);
    return null;
  }
  return data as Event;
}

function App() {
  // ── Auth ────────────────────────────────────────────────────────────────
  const {
    isLoggedIn, adminName, userEmail,
    pendingCount, setPendingCount,
    messagesCount, setMessagesCount,
    fetchPendingCount, handleLogout,
  } = useAuth();

  // ── View / navigation ──────────────────────────────────────────────────
  const [view, setView] = useState<View>("calendar");
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
  const [postEventReturn, setPostEventReturn] = useState<View>("calendar");

  // ── Edit / delete flow ─────────────────────────────────────────────────
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);
  const [postEditReturn, setPostEditReturn] = useState<View>("calendar");
  const [postDeleteReturn, setPostDeleteReturn] = useState<View>("calendar");

  // ── Add event flow ─────────────────────────────────────────────────────
  const [addEventDate, setAddEventDate] = useState<string | undefined>(undefined);
  const [duplicatingEvent, setDuplicatingEvent] = useState<Event | null>(null);

  // ── Search state ───────────────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);
  const [listSearchOpen, setListSearchOpen] = useState(false);
  const scrollToTodayRef = useRef<(() => void) | null>(null);
  const handleToggleSearch = useCallback(() => setSearchOpen(o => !o), []);
  const handleListToggleSearch = useCallback(() => setListSearchOpen(o => !o), []);
  const handleScrollToTodayReady = useCallback((fn: () => void) => { scrollToTodayRef.current = fn; }, []);

  // ── Deep-link: resolve URL on first load ───────────────────────────────
  useEffect(() => {
    const path = window.location.pathname;
    const eventMatch = path.match(/^\/event\/([^/]+)$/);
    if (eventMatch) {
      fetchEventById(eventMatch[1]).then(event => {
        if (event) {
          setViewingEvent(event);
          setView("event");
        }
      });
      return;
    }
    const pageView = PATH_TO_VIEW[path];
    if (pageView) setView(pageView);
  }, []);

  const handleViewEvent = useCallback((event: Event) => {
    setViewingEvent(event);
    setPostEventReturn(view === "event" ? postEventReturn : view as View);
    window.history.pushState({}, "", `/event/${event.id}`);
    setView("event");
  }, [view, postEventReturn]);

  // ── Browser back/forward ───────────────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      const path = window.location.pathname;
      const eventMatch = path.match(/^\/event\/([^/]+)$/);
      if (eventMatch) {
        fetchEventById(eventMatch[1]).then(event => {
          if (event) {
            setViewingEvent(event);
            setView("event");
          }
        });
      } else {
        setViewingEvent(null);
        const pageView = PATH_TO_VIEW[path];
        setView(pageView ?? postEventReturn);
      }
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [postEventReturn]);

  // ── Auth guard ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (view === "admin-queue" && !isLoggedIn) setView("login");
    if (view === "admin-messages" && !isLoggedIn) setView("login");
    if (view === "admin-about" && !isLoggedIn) setView("login");
    if (view === "edit-event" && !isLoggedIn) setView("calendar");
    if (view === "admin-queue" && isLoggedIn) fetchPendingCount();
  }, [view, isLoggedIn, fetchPendingCount]);

  // ── Navigation handlers ────────────────────────────────────────────────
  const handleLogin = () => setView("calendar");

  const handleNavigate = (v: View) => {
    if (v !== "add-event") { setAddEventDate(undefined); setDuplicatingEvent(null); }
    if (v !== "calendar") setSearchOpen(false);
    if (v !== "list") setListSearchOpen(false);
    if (v !== "event") setViewingEvent(null);

    const targetPath = PAGE_PATHS[v] ?? "/";
    if (window.location.pathname !== targetPath) window.history.pushState({}, "", targetPath);

    setView(v);
  };

  const handleEditEvent = (event: Event, returnTo: View = "calendar") => {
    setEditingEvent(event);
    setPostEditReturn(returnTo);
    setView("edit-event");
  };

  const handleEditSaved = (updated: Event) => {
    setEditingEvent(updated);
    if (postEditReturn === "event") setViewingEvent(updated);
    setView(postEditReturn);
    window.scrollTo({ top: 0 });
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
    setViewingEvent(null);
    if (window.location.pathname !== "/") window.history.pushState({}, "", "/");
    setView(postDeleteReturn === "event" ? postEventReturn : postDeleteReturn);
  };

  const handleDeleteCancel = () => {
    setView(postDeleteReturn);
  };

  const handleAddEventFromCalendar = (date: { day: number; month: number; year: number }) => {
    const mm = String(date.month + 1).padStart(2, "0");
    const dd = String(date.day).padStart(2, "0");
    setAddEventDate(`${date.year}-${mm}-${dd}`);
    setDuplicatingEvent(null);
    setView("add-event");
  };

  const handleDuplicateEvent = (event: Event) => {
    setDuplicatingEvent(event);
    setAddEventDate(undefined);
    setView("add-event");
  };

  const handleAppLogout = async () => {
    await handleLogout();
    setView("calendar");
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <PrivacyBanner onNavigate={handleNavigate} />
      <Navbar
        currentView={view}
        isLoggedIn={isLoggedIn}
        pendingCount={pendingCount}
        messagesCount={messagesCount}
        adminName={adminName}
        onNavigate={handleNavigate}
        onLogout={handleAppLogout}
        showCalendarControls={view === "calendar" || view === "list"}
        onScrollToToday={view === "list" ? () => window.scrollTo({ top: 0, behavior: "smooth" }) : () => scrollToTodayRef.current?.()}
        onToggleSearch={view === "list" ? handleListToggleSearch : handleToggleSearch}
      />
      <div key={view} className="page-view" style={{ paddingTop: "60px" }}>
        {view === "calendar" && (
          <Calendar
            onAddEvent={handleAddEventFromCalendar}
            onViewEvent={handleViewEvent}
            searchOpen={searchOpen}
            onToggleSearch={handleToggleSearch}
            onScrollToTodayReady={handleScrollToTodayReady}
          />
        )}
        {view === "list" && (
          <EventList
            onViewEvent={handleViewEvent}
            searchOpen={listSearchOpen}
            onToggleSearch={handleListToggleSearch}
          />
        )}
        {view === "event" && viewingEvent && (
          <EventPage
            event={viewingEvent}
            isLoggedIn={isLoggedIn}
            onBack={() => handleNavigate(postEventReturn)}
            onEdit={ev => handleEditEvent(ev, "event")}
            onDelete={isLoggedIn ? ev => handleDeleteEvent(ev, "event") : undefined}
            onDuplicate={handleDuplicateEvent}
          />
        )}
        {view === "login"      && <Login onLogin={handleLogin} />}
        {view === "add-event"  && <AddEvent prefillDate={addEventDate} prefillEvent={duplicatingEvent ?? undefined} isAdmin={isLoggedIn} />}
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
        {view === "admin-messages" && isLoggedIn && <AdminMessages userEmail={userEmail} adminName={adminName} onMessagesCountChange={setMessagesCount} />}
        {view === "contact" && <Contact />}
        {view === "about" && <AboutUs isLoggedIn={isLoggedIn} onEdit={() => handleNavigate("admin-about")} />}
        {view === "admin-about" && isLoggedIn && (
          <AdminAboutUs
            onSaved={() => handleNavigate("about")}
            onCancel={() => handleNavigate("about")}
          />
        )}
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
