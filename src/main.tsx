import './style.css'
import './themes.css'

import { StrictMode, useState, useEffect, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import ErrorBoundary from "./components/ErrorBoundary";
import { SmoothScroll, scrollToTopInstant } from "./components/SmoothScroll.tsx";
import { pageVariants } from "./utils/motion.ts";
import { supabase } from "./supabaseClient";
import { useAuth } from "./hooks/useAuth";
import { useTheme } from "./hooks/useTheme";
import Calendar from "./pages/Calendar.tsx";
import Login from "./pages/Login.tsx";
import AdminQueue from "./pages/AdminQueue.tsx";
import AdminMessages from "./pages/AdminMessages.tsx";

import Account from "./pages/Account.tsx";
import Home from "./pages/Home.tsx";
import AdminHome from "./pages/AdminHome.tsx";
import Contact from "./pages/Contact.tsx";

import PrivacyPolicy from "./pages/PrivacyPolicy.tsx";
import EventList from "./pages/EventList.tsx";
import MapView from "./pages/MapView.tsx";
import EventPage from "./pages/EventPage.tsx";
import Navbar from "./components/Navbar.tsx";
import PrivacyBanner from "./components/PrivacyBanner.tsx";
import AddEvent from "./components/events/AddEvent.tsx";
import EditEvent from "./components/events/EditEvent.tsx";
import DeleteEventConfirm from "./components/events/DeleteEventConfirm.tsx";
import type { Event } from "./utils/types.ts";
import type { View } from "./utils/views.ts";

/** Page titles for each view. */
const VIEW_TITLES: Partial<Record<View, string>> = {
  calendar:         "Calendar | BSL Edinburgh",
  list:             "Events | BSL Edinburgh",
  map:              "Map | BSL Edinburgh",
  home:             "Home | BSL Edinburgh",
  contact:          "Contact | BSL Edinburgh",
  privacy:          "Privacy Policy | BSL Edinburgh",
  login:            "Login | BSL Edinburgh",
  account:          "Account | BSL Edinburgh",
  "admin-queue":    "Event Queue | BSL Edinburgh",
  "admin-messages": "Messages | BSL Edinburgh",
  "admin-home":     "Edit Home | BSL Edinburgh",
};

/** Every navigable view gets its own shareable URL path. */
const PAGE_PATHS: Partial<Record<View, string>> = {
  calendar:          "/",
  list:              "/list",
  login:             "/login",
  home:              "/home",
  map:               "/map",
  contact:           "/contact",
  privacy:           "/privacy",
  "admin-queue":     "/admin-queue",
  "admin-messages":  "/admin-messages",
  "admin-home":      "/admin-home",
  account:           "/account",
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
  // ── Theme ─────────────────────────────────────────────────────────────
  const { theme, colorMode, setTheme, setColorMode } = useTheme();

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

  useEffect(() => {
    if (view === "event" && viewingEvent) {
      document.title = `${viewingEvent.title} | BSL Edinburgh`;
    } else {
      document.title = VIEW_TITLES[view] ?? "BSL Edinburgh";
    }
  }, [view, viewingEvent]);

  // ── Edit / delete flow ─────────────────────────────────────────────────
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);
  const [postEditReturn, setPostEditReturn] = useState<View>("calendar");
  const [postDeleteReturn, setPostDeleteReturn] = useState<View>("calendar");

  // ── Add event flow ─────────────────────────────────────────────────────
  // Single discriminated-union state so addEventDate and duplicatingEvent are
  // always derived from the same update — they can never disagree.
  type AddEventCtx =
    | { kind: "date"; date: string }
    | { kind: "duplicate"; event: Event }
    | null;
  const [addEventCtx, setAddEventCtx] = useState<AddEventCtx>(null);
  const addEventDate     = addEventCtx?.kind === "date"      ? addEventCtx.date  : undefined;
  const duplicatingEvent = addEventCtx?.kind === "duplicate" ? addEventCtx.event : null;

  // ── Search state ───────────────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);
  const [listSearchOpen, setListSearchOpen] = useState(false);
  const [mapSearchOpen, setMapSearchOpen] = useState(false);
  const scrollToTodayRef = useRef<(() => void) | null>(null);
  const handleToggleSearch = useCallback(() => setSearchOpen(o => !o), []);
  const handleListToggleSearch = useCallback(() => setListSearchOpen(o => !o), []);
  const handleMapToggleSearch = useCallback(() => setMapSearchOpen(o => !o), []);
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
    // Redirect legacy /about URL to /home
    if (path === "/about") {
      window.history.replaceState({}, "", "/home");
      setView("home");
      return;
    }
    const pageView = PATH_TO_VIEW[path];
    if (pageView) setView(pageView);
  }, []);

  const handleViewEvent = useCallback((event: Event) => {
    setViewingEvent(event);
    setPostEventReturn(view === "event" ? postEventReturn : view as View);
    window.history.pushState({}, "", `/event/${event.id}`);
    scrollToTopInstant();
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
    const adminViews = ["admin-queue", "admin-messages", "admin-home", "account"] as const;
    if ((adminViews as readonly string[]).includes(view) && !isLoggedIn) {
      window.history.replaceState({}, "", PAGE_PATHS.login);
      setView("login");
      return;
    }
    if (view === "edit-event" && !isLoggedIn) {
      window.history.replaceState({}, "", "/");
      setView("calendar");
      return;
    }
    if (view === "admin-queue" && isLoggedIn) fetchPendingCount();
  }, [view, isLoggedIn, fetchPendingCount]);

  // ── Navigation handlers ────────────────────────────────────────────────
  const handleLogin = () => {
    window.history.replaceState({}, "", "/");
    setView("calendar");
  };

  const handleNavigate = (v: View) => {
    if (v !== "add-event") setAddEventCtx(null);
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
    scrollToTopInstant();
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
    const returnView = postDeleteReturn === "event" ? postEventReturn : postDeleteReturn;
    const returnPath = PAGE_PATHS[returnView] ?? "/";
    if (window.location.pathname !== returnPath) window.history.pushState({}, "", returnPath);
    setView(returnView);
  };

  const handleDeleteCancel = () => {
    setView(postDeleteReturn);
  };

  const handleAddEventFromCalendar = (date: { day: number; month: number; year: number }) => {
    const mm = String(date.month + 1).padStart(2, "0");
    const dd = String(date.day).padStart(2, "0");
    setAddEventCtx({ kind: "date", date: `${date.year}-${mm}-${dd}` });
    setView("add-event");
  };

  const handleDuplicateEvent = (event: Event) => {
    setAddEventCtx({ kind: "duplicate", event });
    setView("add-event");
  };

  const handleAppLogout = async () => {
    await handleLogout();
    window.history.replaceState({}, "", "/");
    setView("calendar");
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <MotionConfig reducedMotion="user">
      <SmoothScroll>
      <PrivacyBanner onNavigate={handleNavigate} />
      <Navbar
        currentView={view}
        isLoggedIn={isLoggedIn}
        pendingCount={pendingCount}
        messagesCount={messagesCount}
        adminName={adminName}
        onNavigate={handleNavigate}
        theme={theme}
        colorMode={colorMode}
        onSetTheme={setTheme}
        onSetColorMode={setColorMode}
      />
      <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={view}
        className="page-view"
        style={{ paddingTop: "var(--navbar-h)" }}
        variants={pageVariants}
        initial="hidden"
        animate="show"
        exit="exit"
      >
        {view === "calendar" && (
          <Calendar
            onAddEvent={handleAddEventFromCalendar}
            onViewEvent={handleViewEvent}
            onNavigate={handleNavigate}
            searchOpen={searchOpen}
            onToggleSearch={handleToggleSearch}
            onScrollToTodayReady={handleScrollToTodayReady}
          />
        )}
        {view === "list" && (
          <EventList
            onViewEvent={handleViewEvent}
            onNavigate={handleNavigate}
            searchOpen={listSearchOpen}
            onToggleSearch={handleListToggleSearch}
          />
        )}
        {view === "map" && (
          <MapView onViewEvent={handleViewEvent} onNavigate={handleNavigate} searchOpen={mapSearchOpen} onToggleSearch={handleMapToggleSearch} />
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
        {view === "add-event"  && <AddEvent prefillDate={addEventDate} prefillEvent={duplicatingEvent ?? undefined} isAdmin={isLoggedIn} onBrowse={() => handleNavigate("calendar")} />}
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

        {view === "home" && (
          <Home
            isLoggedIn={isLoggedIn}
            onEdit={() => handleNavigate("admin-home")}
            onNavigate={() => handleNavigate("calendar")}
          />
        )}
        {view === "admin-home" && isLoggedIn && (
          <AdminHome
            onSaved={() => handleNavigate("home")}
            onCancel={() => handleNavigate("home")}
          />
        )}
        {view === "account" && isLoggedIn && (
          <Account
            email={userEmail}
            displayName={adminName}
            onLogout={handleAppLogout}
          />
        )}
        {view === "privacy" && <PrivacyPolicy />}
      </motion.div>
      </AnimatePresence>
      </SmoothScroll>
    </MotionConfig>
  );
}

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
