import './style.css'

import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./supabaseClient";
import Calendar from "./components/Calendar.tsx";
import Login from "./components/Login.tsx";
import Navbar from "./components/Navbar.tsx";
import AddEvent from "./components/submit_events/AddEvent.tsx";
import AdminQueue from "./components/submit_events/AdminQueue.tsx";

type View = "calendar" | "login" | "add-event" | "admin-queue";

function App() {
  const [view, setView] = useState<View>("calendar");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      if (!session) setView("calendar");
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (view === "admin-queue" && !isLoggedIn) {
      setView("login");
    }
  }, [view, isLoggedIn]);

  // Fix: Removed redundant setIsLoggedIn(true) — the onAuthStateChange listener
  // above already handles this, so setting it manually here was racing against it.
  const handleLogin = () => {
    setView("calendar");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setView("calendar");
  };

  return (
    <>
      <Navbar
        currentView={view}
        isLoggedIn={isLoggedIn}
        onNavigate={setView}
        onLogout={handleLogout}
      />
      <div style={{ paddingTop: "60px" }}>
        {view === "calendar" && <Calendar />}
        {view === "login" && <Login onLogin={handleLogin} />}
        {view === "add-event" && <AddEvent />}
        {view === "admin-queue" && isLoggedIn && <AdminQueue />}
      </div>
    </>
  );
}

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);