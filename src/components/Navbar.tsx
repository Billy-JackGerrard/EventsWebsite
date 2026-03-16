import type { View } from "../utils/views";
import "./Navbar.css";

type Props = {
  currentView: View;
  isLoggedIn: boolean;
  pendingCount: number;
  onNavigate: (view: View) => void;
  onLogout: () => void;
  onCalendarToday?: () => void;
  onCalendarSearch?: () => void;
};

export default function Navbar({
  currentView,
  isLoggedIn,
  pendingCount,
  onNavigate,
  onLogout,
  onCalendarToday,
  onCalendarSearch,
}: Props) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">Edinburgh BSL Community</div>
      <div className="navbar-links">

        {/* Calendar controls — only visible when on the calendar view */}
        {(onCalendarToday || onCalendarSearch) && (
          <div className="navbar-calendar-controls">
            {onCalendarToday && (
              <button
                className="navbar-calendar-today"
                onClick={onCalendarToday}
                title="Jump to today"
              >
                Today
              </button>
            )}
            {onCalendarSearch && (
              <button
                className="navbar-calendar-search"
                onClick={onCalendarSearch}
                title="Search events"
              >
                ⌕
              </button>
            )}
          </div>
        )}

        <button
          className={`navbar-link ${currentView === "calendar" ? "navbar-link--active" : ""}`}
          onClick={() => onNavigate("calendar")}
        >
          Calendar
        </button>

        <button
          className={`navbar-link ${currentView === "contact" ? "navbar-link--active" : ""}`}
          onClick={() => onNavigate("contact")}
        >
          Contact
        </button>

        {isLoggedIn ? (
          <>
            <button
              className={`navbar-link navbar-link--queue ${currentView === "admin-queue" ? "navbar-link--active" : ""}`}
              onClick={() => onNavigate("admin-queue")}
            >
              Pending Events
              {pendingCount > 0 && (
                <span className="navbar-pending-badge">{pendingCount}</span>
              )}
            </button>
            <button className="navbar-link navbar-link--logout" onClick={onLogout}>
              Log out
            </button>
          </>
        ) : (
          <button
            className={`navbar-link ${currentView === "login" ? "navbar-link--active" : ""}`}
            onClick={() => onNavigate("login")}
          >
            Admin Login
          </button>
        )}

      </div>
    </nav>
  );
}