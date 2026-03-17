import { useState } from "react";
import type { View } from "../utils/views";
import "./Navbar.css";

type Props = {
  currentView: View;
  isLoggedIn: boolean;
  pendingCount: number;
  messagesCount: number;
  onNavigate: (view: View) => void;
  onLogout: () => void;
  showCalendarControls?: boolean;
  onScrollToToday?: () => void;
  onToggleSearch?: () => void;
  onToggleFilters?: () => void;
  filtersActive?: boolean;
};

export default function Navbar({
  currentView,
  isLoggedIn,
  pendingCount,
  messagesCount,
  onNavigate,
  onLogout,
  showCalendarControls,
  onScrollToToday,
  onToggleSearch,
  onToggleFilters,
  filtersActive,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  function navigate(view: View) {
    onNavigate(view);
    setMenuOpen(false);
  }

  function logout() {
    onLogout();
    setMenuOpen(false);
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => navigate("calendar")} role="button">
        <svg className="navbar-logo-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true">
          <rect x="8.5" y="18" width="15"  height="10"   rx="3"    fill="white"/>
          <rect x="4"   y="14" width="3.5" height="7"    rx="1.75" fill="white" transform="rotate(-40 7.75 17.5)"/>
          <rect x="8.5" y="9"  width="3"   height="11"   rx="1.5"  fill="white"/>
          <rect x="12.5" y="6" width="3.5" height="14"   rx="1.75" fill="white"/>
          <rect x="17"  y="7.5" width="3"  height="12.5" rx="1.5"  fill="white"/>
          <rect x="21"  y="11.5" width="2.5" height="8.5" rx="1.25" fill="white"/>
        </svg>
        <span className="navbar-brand-text">
          Edinburgh BSL <span className="navbar-brand-sub">Community</span>
        </span>
      </div>

      {showCalendarControls && (
        <button className="navbar-calendar-btn navbar-today--mobile" onClick={onScrollToToday}>Today</button>
      )}

      <button
        className={`navbar-hamburger${menuOpen ? " navbar-hamburger--open" : ""}`}
        onClick={() => setMenuOpen(o => !o)}
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
      >
        <span />
        <span />
        <span />
      </button>

      <div className={`navbar-links${menuOpen ? " navbar-links--open" : ""}`}>
        {showCalendarControls && (
          <div className="navbar-controls-group">
            <button className="navbar-link navbar-link--desktop-only" onClick={() => { setMenuOpen(false); onScrollToToday?.(); }}>Today</button>
            <button className="navbar-link" onClick={() => { setMenuOpen(false); onToggleSearch?.(); }}>Search</button>
            {onToggleFilters && (
              <button
                className={`navbar-link${filtersActive ? " navbar-link--active" : ""}`}
                onClick={() => { setMenuOpen(false); onToggleFilters(); }}
              >
                Filters
              </button>
            )}
          </div>
        )}

        <button
          className={`navbar-link ${currentView === "calendar" ? "navbar-link--active" : ""}`}
          onClick={() => navigate("calendar")}
        >
          Calendar
        </button>

        <button
          className={`navbar-link ${currentView === "list" ? "navbar-link--active" : ""}`}
          onClick={() => navigate("list")}
        >
          List
        </button>

        {isLoggedIn ? (
          <button
            className={`navbar-link navbar-link--messages ${currentView === "admin-messages" ? "navbar-link--active" : ""}`}
            onClick={() => navigate("admin-messages")}
          >
            Messages
            {messagesCount > 0 && (
              <span className="navbar-pending-badge">{messagesCount}</span>
            )}
          </button>
        ) : (
          <button
            className={`navbar-link ${currentView === "contact" ? "navbar-link--active" : ""}`}
            onClick={() => navigate("contact")}
          >
            Contact
          </button>
        )}

        <button
          className={`navbar-link navbar-link--submit ${currentView === "add-event" ? "navbar-link--active" : ""}`}
          onClick={() => navigate("add-event")}
        >
          Submit Event
        </button>

        {isLoggedIn && (
          <button
            className={`navbar-link navbar-link--queue ${currentView === "admin-queue" ? "navbar-link--active" : ""}`}
            onClick={() => navigate("admin-queue")}
          >
            Pending Events
            {pendingCount > 0 && (
              <span className="navbar-pending-badge">{pendingCount}</span>
            )}
          </button>
        )}

        <button
          className={`navbar-link ${currentView === "about" ? "navbar-link--active" : ""}`}
          onClick={() => navigate("about")}
        >
          About
        </button>

        {isLoggedIn ? (
          <>
            <button className="navbar-link navbar-link--logout" onClick={logout}>
              Log out
            </button>
          </>
        ) : (
          <button
            className={`navbar-link ${currentView === "login" ? "navbar-link--active" : ""}`}
            onClick={() => navigate("login")}
          >
            Admin Login
          </button>
        )}
      </div>
    </nav>
  );
}